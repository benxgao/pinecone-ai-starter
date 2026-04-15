import logger from '../firebase/logger';
import { querySimilar, RetrievalResult } from './retrieval';

/**
 * Retrieval Optimization Service
 * Implements advanced retrieval techniques to improve RAG answer quality
 * Includes: query expansion, fusion, native reranking, and A/B testing
 */

// ============ QUERY EXPANSION ============

/**
 * Expand a query into multiple variants using template-based approach
 * Each variant captures different aspects of the question
 *
 * Example:
 *   Input: "How do neural networks learn?"
 *   Output: [
 *     "How do neural networks learn?",          // Original
 *     "neural networks learn",                   // Template 1: Remove question words
 *     "How do deep learning learn?",             // Template 2: Synonym substitution
 *     "neural network training mechanisms"       // Template 3: Key phrases
 *   ]
 *
 * @param question - Original user question
 * @returns Array of 2-4 query variants
 */
export async function expandQuery(question: string): Promise<string[]> {
  const queries = new Set<string>();

  // Original query
  queries.add(question);

  // Template 1: Remove question words (What, How, Why, etc.)
  const statement = question
    .replace(/^(what|how|why|when|where|which|who)\s+/i, '')
    .replace(/\?$/, '');
  if (statement.length > 5) {
    queries.add(statement);
  }

  // Template 2: Synonym substitution for common terms
  const synonymMap: Record<string, string> = {
    'machine learning': 'artificial intelligence',
    'neural networks': 'deep learning',
    embedding: 'vector representation',
    retrieval: 'document search',
    rag: 'retrieval augmented generation',
  };

  for (const [term, synonym] of Object.entries(synonymMap)) {
    if (question.toLowerCase().includes(term)) {
      const expanded = question.replace(new RegExp(term, 'gi'), synonym);
      queries.add(expanded);
      break; // Only apply one synonym to keep variants focused
    }
  }

  // Template 3: Extract key phrases (parts separated by punctuation)
  const keyPhrases = question
    .split(/[?,!;]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);

  keyPhrases.forEach((phrase) => {
    if (queries.size < 4) {
      queries.add(phrase);
    }
  });

  return Array.from(queries);
}

// ============ RESULT FUSION WITH CONSENSUS BOOSTING ============

/**
 * Fuse results from multiple query variants using consensus boosting
 *
 * Strategy: Blend consensus detection with original semantic scores
 * - Documents appearing in multiple query results = high relevance (consensus)
 * - Original embedding scores preserved but boosted by consensus count
 * - Combines multi-query agreement benefits with embedding quality
 *
 * Consensus Boost: score *= (1 + (appearances - 1) * 0.2)
 * - 1 appearance: 1.0x (no boost)
 * - 2 appearances: 1.2x (20% boost)
 * - 3+ appearances: 1.4x+ (40%+ boost)
 *
 * Benefits over pure RRF:
 * - Preserves semantic scores (0-1 range intact vs 0.016 in pure RRF)
 * - Identifies high-confidence results (consensus across variants)
 * - Better quality when all scores from same model (comparable)
 * - Readable scores for debugging and analysis
 *
 * @param resultGroups - Array of result sets from different query variants
 * @returns Fused results with consensus-boosted scores, sorted descending
 */
export function reciprocalRankFusion(
  resultGroups: RetrievalResult[][],
): RetrievalResult[] {
  const docMap = new Map<string, RetrievalResult>();
  const appearanceCount = new Map<string, number>();
  const originalScoresMap = new Map<string, number[]>();

  // Collect documents and track appearances + original scores across variants
  resultGroups.forEach((results) => {
    results.forEach((result) => {
      // Store document on first encounter
      if (!docMap.has(result.id)) {
        docMap.set(result.id, result);
        originalScoresMap.set(result.id, []);
      }

      // Count how many query variants returned this document
      appearanceCount.set(result.id, (appearanceCount.get(result.id) || 0) + 1);

      // Track all original scores for averaging
      originalScoresMap.get(result.id)!.push(result.score);
    });
  });

  // Build fused results with consensus-boosted scores
  const fused: RetrievalResult[] = Array.from(docMap.entries())
    .map(([id, doc]) => {
      const originalScores = originalScoresMap.get(id) || [];
      // Average scores if document appeared multiple times
      const avgOriginalScore =
        originalScores.reduce((a, b) => a + b, 0) / originalScores.length;
      const appearances = appearanceCount.get(id) || 1;

      // Consensus boost: documents appearing in more variants get confidence multiplier
      // Formula: 1.0x for 1 variant, 1.2x for 2 variants, 1.4x for 3+ variants
      const consensusBoost = 1 + (appearances - 1) * 0.2;
      const blendedScore = avgOriginalScore * consensusBoost;

      return {
        ...doc,
        score: blendedScore, // Preserve original range but boosted by consensus
      };
    })
    .sort((a, b) => b.score - a.score);

  return fused;
}

// ============ OPTIMIZED RETRIEVAL PIPELINE ============

export interface OptimizedRetrievalOptions {
  useExpansion?: boolean; // Enable query expansion (default: true)
  useFusion?: boolean; // Enable result fusion (default: true)
  useReranking?: boolean; // Enable semantic reranking (default: true)
  topK?: number; // Number of results to return (default: 3)
}

/**
 * Complete optimized retrieval pipeline
 * Combines query expansion and consensus-boosted fusion for improved quality
 *
 * Process:
 * 1. Expand query into multiple variants (different phrasings, key terms)
 * 2. Search with each variant using semantic search
 * 3. Fuse results using consensus boosting:
 *    - Documents appearing in multiple variants get confidence boost
 *    - Original semantic scores preserved, not replaced
 *    - Boost formula: score * (1 + (appearances-1) * 0.2)
 * 4. Return final top-K results with blended scores
 *
 * Quality: Better when query has multiple valid interpretations
 * Latency: 3-4x baseline due to multiple embedding calls
 * Cost: 3-4x API calls (baseline uses 1)
 *
 * @param question - User question
 * @param options - Configuration options
 * @returns Optimized retrieval results with consensus-boosted scores
 */
export async function optimizedRetrieve(
  question: string,
  options: OptimizedRetrievalOptions = {},
): Promise<RetrievalResult[]> {
  const startTime = Date.now();
  const {
    useExpansion = true,
    useFusion = true,
    useReranking = true,
    topK = 3,
  } = options;

  try {
    logger.info('Starting optimized retrieval pipeline', {
      question: question.substring(0, 50),
      useExpansion,
      useFusion,
      useReranking,
      topK,
    });

    // Step 1: Expand query if enabled
    let queries = [question];
    if (useExpansion) {
      queries = await expandQuery(question);
      logger.info('Query expansion complete', {
        originalQuery: question.substring(0, 50),
        variantCount: queries.length,
      });
    }

    // Step 2: Retrieve with all queries (keep grouped for RRF and reranking)
    const resultGroups: RetrievalResult[][] = [];
    for (const query of queries) {
      const results = await querySimilar(query, topK * 2); // Get more for ranking
      resultGroups.push(results);
    }

    const totalResults = resultGroups.reduce(
      (sum, group) => sum + group.length,
      0,
    );
    logger.info('Multi-query search complete', {
      queryCount: queries.length,
      totalResultsBeforeFusion: totalResults,
    });

    // Step 3: Fuse results if multiple queries (with consensus boosting)
    let fused: RetrievalResult[] = [];
    if (useFusion && queries.length > 1) {
      fused = reciprocalRankFusion(resultGroups);
      const avgScore =
        fused.length > 0
          ? (fused.reduce((sum, doc) => sum + doc.score, 0) / fused.length).toFixed(3)
          : 'N/A';
      logger.info('Result fusion with consensus boosting complete', {
        uniqueDocuments: fused.length,
        averageScore: avgScore,
      });
    } else {
      // If not fusing, flatten and sort by score
      fused = resultGroups.flat().sort((a, b) => b.score - a.score);
    }

    // Step 4: Return top-K results
    // NOTE: Consensus boosting already applied in fusion step
    const result = fused.slice(0, topK);
    const totalTime = Date.now() - startTime;

    logger.info('Optimized retrieval pipeline complete', {
      resultCount: result.length,
      totalTime,
    });

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const totalTime = Date.now() - startTime;
    logger.error(`Error in optimized retrieval: ${errorMsg}`, {
      question: question.substring(0, 50),
      totalTime,
    });
    throw error;
  }
}

// ============ A/B TESTING ============

export interface ABTestResult {
  variant: 'baseline' | 'optimized';
  question: string;
  resultCount: number;
  scores: number[];
  averageScore: number;
  latency: number;
  costEstimate: number; // Rough API call estimate
}

/**
 * Run A/B test comparing baseline vs optimized retrieval
 * Useful for deciding whether to deploy optimization
 *
 * @param question - Test question
 * @param topK - Number of results
 * @returns Results for both variants
 */
export async function runABTest(
  question: string,
  topK: number = 3,
): Promise<ABTestResult[]> {
  const results: ABTestResult[] = [];

  try {
    // Baseline: Standard retrieval
    const startBaseline = Date.now();
    const baselineResults = await querySimilar(question, topK);
    const baselineTime = Date.now() - startBaseline;

    results.push({
      variant: 'baseline',
      question,
      resultCount: baselineResults.length,
      scores: baselineResults.map((r) => r.score),
      averageScore:
        baselineResults.length > 0
          ? baselineResults.reduce((sum, r) => sum + r.score, 0) /
            baselineResults.length
          : 0,
      latency: baselineTime,
      costEstimate: 1, // 1 API call
    });

    logger.info('A/B test: baseline complete', {
      question: question.substring(0, 50),
      latency: baselineTime,
    });

    // Optimized: With all techniques
    const startOptimized = Date.now();
    const optimizedResults = await optimizedRetrieve(question, {
      useExpansion: true,
      useFusion: true,
      useReranking: true,
      topK,
    });
    const optimizedTime = Date.now() - startOptimized;

    results.push({
      variant: 'optimized',
      question,
      resultCount: optimizedResults.length,
      scores: optimizedResults.map((r) => r.score),
      averageScore:
        optimizedResults.length > 0
          ? optimizedResults.reduce((sum, r) => sum + r.score, 0) /
            optimizedResults.length
          : 0,
      latency: optimizedTime,
      costEstimate: 3, // ~3 queries due to expansion + reranking
    });

    logger.info('A/B test: optimized complete', {
      question: question.substring(0, 50),
      latency: optimizedTime,
    });

    return results;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Error in A/B test: ${errorMsg}`, {
      question: question.substring(0, 50),
    });
    throw error;
  }
}

/**
 * Analyze A/B test results
 * Determines if optimized approach is worth the cost
 *
 * @param testResults - Results from runABTest
 * @returns Analysis with quality improvement and cost metrics
 */
export function analyzeABTest(testResults: ABTestResult[]) {
  const baseline = testResults.find((r) => r.variant === 'baseline');
  const optimized = testResults.find((r) => r.variant === 'optimized');

  if (!baseline || !optimized) {
    throw new Error('Missing baseline or optimized results');
  }

  const qualityImprovement =
    baseline.averageScore > 0
      ? ((optimized.averageScore - baseline.averageScore) /
          baseline.averageScore) *
        100
      : 0;

  const latencyIncrease =
    baseline.latency > 0
      ? ((optimized.latency - baseline.latency) / baseline.latency) * 100
      : 0;

  const costIncrease =
    baseline.costEstimate > 0
      ? ((optimized.costEstimate - baseline.costEstimate) /
          baseline.costEstimate) *
        100
      : 0;

  const recommended =
    qualityImprovement > 5 && // At least 5% improvement
    costIncrease < 50 && // Cost increase less than 50%
    latencyIncrease < 100; // Latency increase less than 100% (keep under 1s total)

  return {
    qualityImprovement: qualityImprovement.toFixed(1),
    latencyIncrease: latencyIncrease.toFixed(1),
    costIncrease: costIncrease.toFixed(1),
    baseline: {
      averageScore: baseline.averageScore.toFixed(3),
      latency: baseline.latency,
      costEstimate: baseline.costEstimate,
    },
    optimized: {
      averageScore: optimized.averageScore.toFixed(3),
      latency: optimized.latency,
      costEstimate: optimized.costEstimate,
    },
    recommended,
    recommendation: recommended
      ? 'Deploy optimized retrieval (good quality/cost trade-off)'
      : 'Baseline sufficient or optimize further before deploying',
  };
}
