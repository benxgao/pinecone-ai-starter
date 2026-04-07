import { Request, Response } from 'express';
import logger from '../../services/firebase/logger';
import {
  querySimilar,
  querySimilarFiltered,
  formatResults,
  calculateMetrics,
} from '../../services/rag/retrieval';

/**
 * POST /api/search
 *
 * Semantic search to find documents similar to query
 *
 * Request body:
 * {
 *   "query": "What is machine learning?",
 *   "topK": 3,
 *   "minScore": 0.7 (optional)
 * }
 *
 * Response:
 * {
 *   "status": "success",
 *   "query": "What is machine learning?",
 *   "topK": 3,
 *   "resultCount": 3,
 *   "results": [
 *     {
 *       "id": "doc-1",
 *       "text": "Machine learning is...",
 *       "score": 0.924,
 *       "metadata": { "source": "ai-intro", ... }
 *     },
 *     ...
 *   ],
 *   "metrics": {
 *     "totalTime": 245,
 *     "averageScore": 0.87,
 *     "scores": [0.924, 0.812, 0.756]
 *   }
 * }
 */
export async function searchHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    const { query, topK = 3, minScore, formatted = false } = req.body;

    // Validate query
    if (!query || typeof query !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Missing required field: query (must be a non-empty string)',
      });
      return;
    }

    // Validate topK
    if (topK && (!Number.isInteger(topK) || topK < 1 || topK > 100)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid topK: must be an integer between 1 and 100',
      });
      return;
    }

    // Validate minScore if provided
    if (minScore && (typeof minScore !== 'number' || minScore < 0 || minScore > 1)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid minScore: must be a number between 0 and 1',
      });
      return;
    }

    logger.info('Similarity search request', {
      query: query.substring(0, 100),
      topK,
      minScore: minScore || 'none',
      formatted,
    });

    // Execute search with or without filtering
    const results = minScore
      ? await querySimilarFiltered(query, topK, minScore)
      : await querySimilar(query, topK);

    const totalTime = Date.now() - startTime;
    const metrics = calculateMetrics(query, results, topK, totalTime);

    logger.info('Search completed successfully', {
      query: query.substring(0, 100),
      resultCount: results.length,
      totalTime,
      averageScore: metrics.averageScore,
    });

    // Return formatted or raw results
    if (formatted) {
      res.status(200).json({
        status: 'success',
        query,
        topK,
        resultCount: results.length,
        formatted: formatResults(results),
        metrics,
      });
    } else {
      res.status(200).json({
        status: 'success',
        query,
        topK,
        resultCount: results.length,
        results,
        metrics,
      });
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.error(`Error in search: ${errorMsg}`, {
      totalTime,
      body: req.body,
    });

    res.status(500).json({
      status: 'error',
      message: `Search failed: ${errorMsg}`,
    });
  }
}

/**
 * GET /api/search/sample
 *
 * Get sample search queries for testing
 *
 * Response:
 * {
 *   "queries": [
 *     {
 *       "text": "What is machine learning?",
 *       "description": "Query about fundamental ML concepts",
 *       "expectedTopics": ["machine learning", "AI"]
 *     },
 *     ...
 *   ]
 * }
 */
export async function sampleSearchQueriesHandler(req: Request, res: Response): Promise<void> {
  try {
    const sampleQueries = [
      {
        text: 'What is machine learning?',
        description: 'Query about fundamental ML concepts',
        expectedTopics: ['machine learning', 'artificial intelligence', 'learning'],
      },
      {
        text: 'How do embeddings work?',
        description: 'Query about embeddings and vectorization',
        expectedTopics: ['embeddings', 'vectors', 'semantics'],
      },
      {
        text: 'Tell me about vector databases',
        description: 'Query about vector storage and retrieval',
        expectedTopics: ['vector database', 'pinecone', 'indexing'],
      },
      {
        text: 'AI learns from examples',
        description: 'Semantic query with different wording',
        expectedTopics: ['machine learning', 'learning', 'data'],
      },
      {
        text: 'embeddings and vectors',
        description: 'Related concept query',
        expectedTopics: ['embeddings', 'vectors', 'representations'],
      },
    ];

    logger.info('Sample search queries requested');

    res.status(200).json({
      status: 'success',
      queryCount: sampleQueries.length,
      queries: sampleQueries,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Error in sampleSearchQueriesHandler: ${errorMsg}`);

    res.status(500).json({
      status: 'error',
      message: `Failed to retrieve sample queries: ${errorMsg}`,
    });
  }
}
