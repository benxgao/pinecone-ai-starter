import { Router, Request, Response } from 'express';
import {
  optimizedRetrieve,
  runABTest,
  analyzeABTest,
} from '../../services/rag/optimization';
import logger from '../../services/firebase/logger';

const router = Router();

/**
 * POST /api/optimization/retrieve
 *
 * Optimized retrieval with query expansion, fusion, and reranking
 * Use this for improved quality when baseline search is insufficient
 *
 * POSTMAN SETUP:
 * 1. Method: POST
 * 2. URL: {{baseUrl}}/api/optimization/retrieve
 * 3. Headers:
 *    - Content-Type: application/json
 *    - auth_token: your_token
 * 4. Body (raw JSON):
 *    {
 *      "question": "What is machine learning?",
 *      "useExpansion": true,
 *      "useFusion": true,
 *      "useReranking": true,
 *      "topK": 3
 *    }
 *
 * Response (200 OK):
 * {
 *   "status": "success",
 *   "question": "What is machine learning?",
 *   "results": [
 *     {
 *       "id": "doc-1",
 *       "text": "Machine learning is...",
 *       "score": 0.924,
 *       "metadata": { "source": "ai-intro" }
 *     },
 *     ...
 *   ],
 *   "resultCount": 3,
 *   "metrics": {
 *     "totalTime": 450,
 *     "averageScore": 0.87,
 *     "techniques": ["query_expansion", "fusion", "reranking"]
 *   }
 * }
 *
 * Response (400 Bad Request):
 * {
 *   "status": "error",
 *   "message": "Missing required field: question"
 * }
 */
router.post('/retrieve', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const {
      question,
      useExpansion = true,
      useFusion = true,
      useReranking = true,
      topK = 3,
    } = req.body;

    // Validation
    if (!question || typeof question !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Missing required field: question (must be a non-empty string)',
      });
      return;
    }

    if (question.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Question cannot be empty',
      });
      return;
    }

    if (topK && (!Number.isInteger(topK) || topK < 1 || topK > 20)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid topK: must be an integer between 1 and 20',
      });
      return;
    }

    logger.info('Optimized retrieval request received', {
      question: question.substring(0, 100),
      useExpansion,
      useFusion,
      useReranking,
      topK,
    });

    // Execute optimized retrieval
    const results = await optimizedRetrieve(question, {
      useExpansion,
      useFusion,
      useReranking,
      topK,
    });

    const totalTime = Date.now() - startTime;
    const techniques = [];
    if (useExpansion) techniques.push('query_expansion');
    if (useFusion) techniques.push('fusion');
    if (useReranking) techniques.push('reranking');

    const scores = results.map((r) => r.score);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    logger.info('Optimized retrieval complete', {
      question: question.substring(0, 100),
      resultCount: results.length,
      totalTime,
      averageScore: averageScore.toFixed(3),
    });

    res.json({
      status: 'success',
      question,
      results,
      resultCount: results.length,
      metrics: {
        totalTime,
        averageScore: parseFloat(averageScore.toFixed(3)),
        scores,
        techniques,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const totalTime = Date.now() - startTime;
    logger.error(`Optimized retrieval error: ${errorMsg}`, {
      totalTime,
    });
    res.status(500).json({
      status: 'error',
      message: `Optimized retrieval failed: ${errorMsg}`,
    });
  }
});

/**
 * POST /api/optimization/ab-test
 *
 * Compare baseline vs optimized retrieval
 * Helps decide whether to deploy optimization techniques
 *
 * POSTMAN SETUP:
 * 1. Method: POST
 * 2. URL: {{baseUrl}}/api/optimization/ab-test
 * 3. Headers:
 *    - Content-Type: application/json
 *    - auth_token: your_token
 * 4. Body (raw JSON):
 *    {
 *      "question": "How do neural networks learn?",
 *      "topK": 3
 *    }
 *
 * Response (200 OK):
 * {
 *   "status": "success",
 *   "testResults": [
 *     {
 *       "variant": "baseline",
 *       "question": "How do neural networks learn?",
 *       "resultCount": 3,
 *       "scores": [0.924, 0.812, 0.756],
 *       "averageScore": 0.831,
 *       "latency": 145,
 *       "costEstimate": 1
 *     },
 *     {
 *       "variant": "optimized",
 *       "question": "How do neural networks learn?",
 *       "resultCount": 3,
 *       "scores": [0.945, 0.892, 0.834],
 *       "averageScore": 0.890,
 *       "latency": 432,
 *       "costEstimate": 3
 *     }
 *   ],
 *   "analysis": {
 *     "qualityImprovement": "7.1",
 *     "latencyIncrease": "198.0",
 *     "costIncrease": "200.0",
 *     "recommended": true,
 *     "recommendation": "Deploy optimized retrieval (good quality/cost trade-off)"
 *   }
 * }
 *
 * Response (400 Bad Request):
 * {
 *   "status": "error",
 *   "message": "Missing required field: question"
 * }
 */
router.post('/ab-test', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const { question, topK = 3 } = req.body;

    // Validation
    if (!question || typeof question !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Missing required field: question (must be a non-empty string)',
      });
      return;
    }

    if (question.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Question cannot be empty',
      });
      return;
    }

    logger.info('A/B test request received', {
      question: question.substring(0, 100),
      topK,
    });

    // Run A/B test
    const testResults = await runABTest(question, topK);

    // Analyze results
    const analysis = analyzeABTest(testResults);

    const totalTime = Date.now() - startTime;

    logger.info('A/B test complete', {
      question: question.substring(0, 100),
      qualityImprovement: analysis.qualityImprovement,
      recommended: analysis.recommended,
      totalTime,
    });

    res.json({
      status: 'success',
      testResults,
      analysis,
      totalTime,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const totalTime = Date.now() - startTime;
    logger.error(`A/B test error: ${errorMsg}`, {
      totalTime,
    });
    res.status(500).json({
      status: 'error',
      message: `A/B test failed: ${errorMsg}`,
    });
  }
});

/**
 * POST /api/optimization/query-expansion
 *
 * Generate query variants for a question
 * Useful for understanding how the system reformulates your question
 *
 * POSTMAN SETUP:
 * 1. Method: POST
 * 2. URL: {{baseUrl}}/api/optimization/query-expansion
 * 3. Headers:
 *    - Content-Type: application/json
 *    - auth_token: your_token
 * 4. Body (raw JSON):
 *    {
 *      "question": "What is machine learning?"
 *    }
 *
 * Response (200 OK):
 * {
 *   "status": "success",
 *   "originalQuestion": "What is machine learning?",
 *   "variants": [
 *     "What is machine learning?",
 *     "machine learning",
 *     "What is artificial intelligence?",
 *     "machine learning fundamentals"
 *   ],
 *   "variantCount": 4
 * }
 *
 * Response (400 Bad Request):
 * {
 *   "status": "error",
 *   "message": "Missing required field: question"
 * }
 */
router.post('/query-expansion', async (req: Request, res: Response): Promise<void> => {
  try {
    const { question } = req.body;

    // Validation
    if (!question || typeof question !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Missing required field: question (must be a non-empty string)',
      });
      return;
    }

    if (question.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Question cannot be empty',
      });
      return;
    }

    logger.info('Query expansion request received', {
      question: question.substring(0, 100),
    });

    // Import here to avoid circular dependency
    const { expandQuery } = await import('../../services/rag/optimization.js');
    const variants = await expandQuery(question);

    logger.info('Query expansion complete', {
      question: question.substring(0, 100),
      variantCount: variants.length,
    });

    res.json({
      status: 'success',
      originalQuestion: question,
      variants,
      variantCount: variants.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Query expansion error: ${errorMsg}`, {});
    res.status(500).json({
      status: 'error',
      message: `Query expansion failed: ${errorMsg}`,
    });
  }
});

/**
 * GET /api/optimization/doc
 *
 * View API documentation and usage examples
 * Helpful reference for understanding optimization endpoints
 *
 * POSTMAN SETUP:
 * 1. Method: GET
 * 2. URL: {{baseUrl}}/api/optimization/doc
 * 3. No body needed
 *
 * Response (200 OK):
 * {
 *   "status": "success",
 *   "documentation": {
 *     "endpoints": [
 *       {
 *         "name": "Optimized Retrieve",
 *         "method": "POST",
 *         "path": "/api/optimization/retrieve",
 *         "description": "..."
 *       },
 *       ...
 *     ],
 *     "techniques": [
 *       {
 *         "name": "Query Expansion",
 *         "description": "Generate multiple search queries from one question",
 *         "improvement": "20-40%",
 *         "cost": "4x retrieval cost"
 *       },
 *       ...
 *     ]
 *   }
 * }
 */
router.get('/doc', (req: Request, res: Response): void => {
  res.json({
    status: 'success',
    documentation: {
      endpoints: [
        {
          name: 'Optimized Retrieve',
          method: 'POST',
          path: '/api/optimization/retrieve',
          description: 'Retrieval with query expansion, fusion, and reranking',
          parameters: {
            question: 'string (required) - User question',
            useExpansion: 'boolean (default: true) - Enable query expansion',
            useFusion: 'boolean (default: true) - Enable result fusion',
            useReranking: 'boolean (default: true) - Enable semantic reranking',
            topK: 'integer (default: 3) - Number of results to return',
          },
        },
        {
          name: 'A/B Test',
          method: 'POST',
          path: '/api/optimization/ab-test',
          description: 'Compare baseline vs optimized retrieval',
          parameters: {
            question: 'string (required) - Test question',
            topK: 'integer (default: 3) - Number of results',
          },
        },
        {
          name: 'Query Expansion',
          method: 'POST',
          path: '/api/optimization/query-expansion',
          description: 'Generate query variants',
          parameters: {
            question: 'string (required) - Original question',
          },
        },
      ],
      techniques: [
        {
          name: 'Query Expansion',
          description: 'Generate 3-4 alternative phrasings of the question',
          improvement: '20-40%',
          cost: '4x retrieval cost',
          use_when: 'Documents might be worded differently than the question',
        },
        {
          name: 'Reciprocal Rank Fusion (RRF)',
          description: 'Combine results from multiple queries into one ranking',
          improvement: '10-20%',
          cost: 'Minimal (only computation)',
          use_when: 'Multiple retrieval methods give different results',
        },
        {
          name: 'Semantic Reranking',
          description: 'Use embeddings to reorder results by semantic relevance',
          improvement: '5-15%',
          cost: 'Minimal (embeddings already computed)',
          use_when: 'Initial results mixed quality',
        },
        {
          name: 'A/B Testing',
          description: 'Compare baseline and optimized approaches',
          improvement: 'N/A (measuring approach)',
          cost: 'N/A',
          use_when: 'Deciding whether to deploy improvements',
        },
      ],
      decision_tree: {
        nDCG_baseline_gt_0_85: 'Stop - optimization not needed',
        missed_documents: 'Try query expansion',
        low_quality_results: 'Try semantic reranking',
        diverse_results_needed: 'Try RRF (requires multiple sources)',
        uncertain: 'Run A/B test to decide',
      },
      postman_environment: {
        baseUrl: 'http://localhost:5001/YOUR_PROJECT/us-central1',
        headers: {
          'Content-Type': 'application/json',
          'auth_token': 'your_token_here',
        },
      },
    },
  });
});

export default router;
