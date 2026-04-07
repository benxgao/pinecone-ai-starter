import { EmbeddingService } from '../../adapters/openai/embedding';
import { getPineconeIndexClient } from '../../adapters/pinecone/operations';
import type { Document } from './document-loader';
import logger from '../firebase/logger';

export interface UpsertOptions {
  batchSize?: number; // Default: 100
  rateLimitMs?: number; // Delay between API calls
  dryRun?: boolean; // Don't actually upsert
  resumeFrom?: number; // Skip first N documents
}

export interface UpsertMetrics {
  documentsLoaded: number;
  documentsEmbedded: number;
  vectorsUpserted: number;
  failedCount: number;
  totalTime: number; // milliseconds
  embeddingCost: number; // USD
  storageCost: number; // USD per month
}

interface UpsertVector {
  id: string;
  values: number[];
  metadata: Record<string, any>;
}

const DEFAULT_OPTIONS: Required<UpsertOptions> = {
  batchSize: 100,
  rateLimitMs: 100,
  dryRun: false,
  resumeFrom: 0,
};

const embeddingService = new EmbeddingService();

/**
 * Embed documents in OpenAI, and prepare for Pinecone upsert
 */
async function embedDocuments(
  documents: Document[],
  options: Required<UpsertOptions>,
): Promise<{ vectors: UpsertVector[]; cost: number }> {
  const vectors: UpsertVector[] = [];
  let totalCost = 0;

  console.log(`
  📝 Embedding ${documents.length} documents...`);
  logger.info(`Starting embedding for ${documents.length} documents`);

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];

    // Skip if resuming
    if (i < options.resumeFrom) continue;

    try {
      // Embed text
      const embedding = await embeddingService.createEmbedding(doc.text);

      // Track cost
      const tokens = Math.ceil(doc.text.length / 4);
      const cost = tokens * (0.02 / 1_000_000);
      totalCost += cost;

      // Create vector
      vectors.push({
        id: doc.id,
        values: embedding,
        metadata: {
          text: doc.text.substring(0, 1000), // Limit metadata size
          ...doc.metadata,
        },
      });

      // Log progress every 10 documents
      if ((i + 1) % 10 === 0) {
        console.log(
          `  [${i + 1}/${documents.length}] ` +
            `Cost so far: $${totalCost.toFixed(6)}`,
        );
      }

      // Rate limiting
      if (i < documents.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.rateLimitMs),
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`  ⚠️  Failed to embed ${doc.id}: ${errorMsg}`);
      logger.warn(`Failed to embed document ${doc.id}: ${errorMsg}`);
      // Continue with next document
    }
  }

  console.log(`  ✓ Embedded ${vectors.length}/${documents.length}`);
  console.log(`  Estimated cost: $${totalCost.toFixed(6)}`);
  logger.info(`Completed embedding for ${vectors.length} documents`, {
    totalCost,
    failedCount: documents.length - vectors.length,
  });

  return { vectors, cost: totalCost };
}

/**
 * Upsert vectors to Pinecone in batches
 */
async function upsertBatch(
  vectors: UpsertVector[],
  batchSize: number = 100,
): Promise<{ upsertedCount: number; failedIds: string[] }> {
  const index = getPineconeIndexClient();
  let upsertedCount = 0;
  const failedIds: string[] = [];

  console.log(`
  ⬆️  Upserting ${vectors.length} vectors...`);
  logger.info(
    `Starting upsert of ${vectors.length} vectors in batches of ${batchSize}`,
  );

  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);

    try {
      // Upsert batch to Pinecone
      const result = await index.upsert(batch as any);
      upsertedCount += (result as any).upsertedCount || batch.length;

      console.log(
        `  [${Math.min(i + batchSize, vectors.length)}/${vectors.length}] ` +
          `Upserted: ${batch.length}`,
      );

      logger.info('Upserted batch', {
        batchNumber: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
        totalUpserted: upsertedCount,
      });
    } catch (error) {
      // Track failed vectors
      batch.forEach((v) => failedIds.push(v.id));
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`  ⚠️  Batch upsert failed: ${errorMsg}`);
      logger.warn('Batch upsert failed', {
        batchNumber: Math.floor(i / batchSize) + 1,
        error: errorMsg,
        batchSize: batch.length,
      });
    }
  }

  console.log(
    `  ✓ Completed: ${upsertedCount} upserted, ${failedIds.length} failed`,
  );
  logger.info('Upsert completed', {
    upsertedCount,
    failedCount: failedIds.length,
  });

  return { upsertedCount, failedIds };
}

/**
 * Complete upsert pipeline
 */
export async function upsertDocuments(
  documents: Document[],
  options: UpsertOptions = {},
): Promise<UpsertMetrics> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  console.log(`
  🚀 Upsert Pipeline Started`);
  console.log(`   Documents: ${documents.length}`);
  console.log(`   Batch size: ${opts.batchSize}`);
  console.log(`   Rate limit: ${opts.rateLimitMs}ms between embeddings`);
  console.log(`   Dry run: ${opts.dryRun}`);

  logger.info('Starting upsert pipeline', {
    documentCount: documents.length,
    batchSize: opts.batchSize,
    rateLimitMs: opts.rateLimitMs,
    dryRun: opts.dryRun,
  });

  if (documents.length === 0) {
    throw new Error('No documents to upsert');
  }

  // Step 1: Embed in OpenAI
  const { vectors, cost: embeddingCost } = await embedDocuments(
    documents,
    opts,
  );

  if (vectors.length === 0) {
    throw new Error('No vectors created (all embeddings failed)');
  }

  // Step 2: Upsert in Pinecone
  const { upsertedCount, failedIds } = opts.dryRun
    ? { upsertedCount: vectors.length, failedIds: [] }
    : await upsertBatch(vectors, opts.batchSize);

  // Step 3: Estimate storage cost (~$0.025 per 1K vectors/month)
  const storageCost = (upsertedCount / 1000) * 0.025;

  const duration = Date.now() - startTime;

  console.log(`
  ✅ Upsert Complete`);
  console.log(`   Time: ${(duration / 1000).toFixed(1)}s`);
  console.log(`   Documents loaded: ${documents.length}`);
  console.log(`   Vectors upserted: ${upsertedCount}`);
  console.log(`   Failed: ${failedIds.length}`);
  console.log(`   Embedding cost: $${embeddingCost.toFixed(6)}`);
  console.log(`   Storage cost/month: $${storageCost.toFixed(6)}`);

  if (failedIds.length > 0) {
    console.warn(`   Failed IDs: ${failedIds.join(', ')}`);
    logger.warn('Upsert completed with failures', {
      failedIds,
      failedCount: failedIds.length,
    });
  }

  logger.info('Upsert pipeline completed successfully', {
    documentsLoaded: documents.length,
    documentsEmbedded: vectors.length,
    vectorsUpserted: upsertedCount,
    failedCount: failedIds.length,
    totalTime: duration,
    embeddingCost,
    storageCost,
  });

  return {
    documentsLoaded: documents.length,
    documentsEmbedded: vectors.length,
    vectorsUpserted: upsertedCount,
    failedCount: failedIds.length,
    totalTime: duration,
    embeddingCost,
    storageCost,
  };
}
