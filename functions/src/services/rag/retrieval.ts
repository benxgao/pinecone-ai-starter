import { EmbeddingService } from '../../adapters/openai/embedding';
import { getPineconeIndexClient } from '../../adapters/pinecone/operations';
import logger from '../firebase/logger';

/**
 * Retrieval Service
 * Handles semantic search by embedding queries and finding similar documents
 * Uses cosine similarity for relevance scoring
 */

export interface RetrievalResult {
  id: string;
  text: string;
  score: number; // Cosine similarity 0.0-1.0
  metadata?: Record<string, any>;
}

export interface RetrievalMetrics {
  query: string;
  topK: number;
  resultCount: number;
  totalTime: number; // milliseconds
  scores: number[];
  averageScore: number;
}

const embeddingService = new EmbeddingService();

/**
 * Query similar documents from Pinecone index
 * Embeds query and searches for top-K most similar vectors
 *
 * @param query - Natural language question or text to search for
 * @param topK - Number of results to return (default: 3)
 * @returns Array of documents sorted by similarity score (highest first)
 */
export async function querySimilar(
  query: string,
  topK: number = 3,
): Promise<RetrievalResult[]> {
  const startTime = Date.now();

  try {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      throw new Error('Query cannot be empty or whitespace only');
    }

    if (topK < 1 || !Number.isInteger(topK)) {
      throw new Error('topK must be a positive integer');
    }

    if (topK > 100) {
      throw new Error('topK must be 100 or less');
    }

    logger.info('Starting similarity search', {
      query: trimmedQuery.substring(0, 100),
      topK,
    });

    // Step 1: Embed the query using same model as documents
    const queryEmbedding = await embeddingService.createEmbedding(trimmedQuery);

    // Step 2: Query Pinecone for similar vectors
    const index = getPineconeIndexClient();
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    // Step 3: Transform results to RetrievalResult format
    const results: RetrievalResult[] = (searchResults.matches || []).map((match: any) => ({
      id: match.id,
      text: match.metadata?.text || '',
      score: match.score || 0,
      metadata: match.metadata,
    }));

    const totalTime = Date.now() - startTime;

    logger.info('Similarity search completed', {
      query: trimmedQuery.substring(0, 100),
      resultCount: results.length,
      scores: results.map((r) => r.score),
      totalTime,
    });

    return results;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Error in querySimilar: ${errorMsg}`, {
      query: query.substring(0, 100),
      totalTime,
    });
    throw error;
  }
}

/**
 * Convert similarity score to human-readable label
 * Helps interpret relevance of results
 *
 * @param score - Cosine similarity score (0.0-1.0)
 * @returns Human-readable description of relevance
 */
export function getSimilarityLabel(score: number): string {
  if (score >= 0.9) return '🟢 Perfect match';
  if (score >= 0.8) return '🟢 Excellent match';
  if (score >= 0.7) return '🟡 Good match';
  if (score >= 0.6) return '🟡 Fair match';
  if (score >= 0.5) return '🔴 Weak match';
  return '🔴 Poor match';
}

/**
 * Format results for human-readable display
 * Includes scores and similarity labels
 *
 * @param results - Array of retrieval results
 * @returns Formatted string representation
 */
export function formatResults(results: RetrievalResult[]): string {
  if (results.length === 0) return 'No results found';

  return results
    .map(
      (result, index) =>
        `${index + 1}. [${result.score.toFixed(4)}] ${getSimilarityLabel(result.score)}\n` +
        `   ID: ${result.id}\n` +
        `   Text: ${result.text.substring(0, 200)}${result.text.length > 200 ? '...' : ''}\n` +
        `   Source: ${result.metadata?.source || 'unknown'}`,
    )
    .join('\n\n');
}

/**
 * Filter results by minimum similarity score threshold
 * Useful for quality control to avoid low-relevance results
 *
 * @param query - Natural language question
 * @param topK - Number of results to return after filtering
 * @param minScore - Minimum similarity score threshold (default: 0.7)
 * @returns Array of high-quality results
 */
export async function querySimilarFiltered(
  query: string,
  topK: number = 3,
  minScore: number = 0.7,
): Promise<RetrievalResult[]> {
  if (minScore < 0 || minScore > 1) {
    throw new Error('minScore must be between 0 and 1');
  }

  // Fetch more results to account for filtering
  const overFetchMultiplier = 2;
  const results = await querySimilar(query, topK * overFetchMultiplier);

  // Filter by score and return top-K
  return results.filter((r) => r.score >= minScore).slice(0, topK);
}

/**
 * Calculate metrics for a search operation
 * Useful for monitoring and understanding search quality
 *
 * @param query - The search query
 * @param results - Results from querySimilar
 * @param topK - Requested top-K parameter
 * @param totalTime - Total time in milliseconds
 * @returns Metrics object with statistics
 */
export function calculateMetrics(
  query: string,
  results: RetrievalResult[],
  topK: number,
  totalTime: number,
): RetrievalMetrics {
  const scores = results.map((r) => r.score);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    query: query.substring(0, 100),
    topK,
    resultCount: results.length,
    totalTime,
    scores,
    averageScore,
  };
}
