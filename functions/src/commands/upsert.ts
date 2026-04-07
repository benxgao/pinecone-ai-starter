import { loadDocumentsFromJSON } from '../services/rag/document-loader';
import { upsertDocuments } from '../services/rag/upsert';

// Usage: npx ts-node src/commands/upsert.ts <file.json>
async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.log('Usage: npx ts-node src/commands/upsert.ts <documents.json>');
    console.log('\nExample documents.json:');
    console.log(
      JSON.stringify(
        [
          {
            id: 'doc-1',
            text: 'Machine learning is a subset of AI...',
            metadata: { source: 'wiki', topic: 'ai' },
          },
          {
            id: 'doc-2',
            text: 'Embeddings are numerical representations...',
            metadata: { source: 'article', topic: 'embeddings' },
          },
        ],
        null,
        2
      )
    );
    process.exit(1);
  }

  try {
    console.log(`Loading documents from ${filePath}...`);
    const documents = await loadDocumentsFromJSON(filePath);
    console.log(`Loaded ${documents.length} documents`);

    const metrics = await upsertDocuments(documents, {
      batchSize: 50,
      rateLimitMs: 200, // Conservative rate for API limits
    });

    console.log('\n    📊 Final Metrics:');
    console.log(`  Loaded:          ${metrics.documentsLoaded}`);
    console.log(`  Embedded:        ${metrics.documentsEmbedded}`);
    console.log(`  Upserted:        ${metrics.vectorsUpserted}`);
    console.log(`  Failed:          ${metrics.failedCount}`);
    console.log(`  Duration:        ${(metrics.totalTime / 1000).toFixed(1)}s`);
    console.log(`  Embedding cost:  $${metrics.embeddingCost.toFixed(6)}`);
    console.log(`  Monthly storage: $${metrics.storageCost.toFixed(6)}`);
  } catch (error) {
    console.error('Upsert failed:', error);
    process.exit(1);
  }
}

main();
