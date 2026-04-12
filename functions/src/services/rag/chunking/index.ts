/**
 * Task 06: Chunking Strategies
 * Three implementations: Fixed-size, Sliding Window, Semantic
 * Trade-offs: simplicity vs context preservation vs retrieval quality
 */

import { ChunkStrategy } from '../../../types/rag';
import {
  CHARS_PER_TOKEN,
  generateChunksInModeFixedSize,
  // generateChunksInModeSemantic,
  generateChunksInModeSlidingWindow,
} from './getChunks';
import { splitTextInModeSemantic } from './splitTextInModeSemantic';

/**
 * Interface for chunking results with metadata
 */
export interface ChunkedResult {
  chunks: string[];
  chunkCount: number;
  avgChunkSize: number;
  metadata: {
    strategy: string;
    chunkSize: number;
    overlap?: number;
    estimatedTokens: number;
    estimatedCost: number;
  };
}

/**
 * Strategy 1: Fixed-size chunking
 * Pros: ✅ Simple, fast, deterministic, cheapest
 * Cons: ❌ No context at boundaries, breaks mid-sentence
 *
 * Best for: Initial testing, homogeneous documents
 */
export function fixedSizeChunk(
  text: string,
  chunkSizeTokens: number = 8,
): ChunkedResult {
  const chunks = generateChunksInModeFixedSize(text, chunkSizeTokens);

  const totalChars = text.length;
  const estimatedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);
  const estimatedCost = chunks.length * 0.000002; // $0.02 per 1M tokens

  return {
    chunks,
    chunkCount: chunks.length,
    avgChunkSize: Math.round(totalChars / chunks.length),
    metadata: {
      strategy: ChunkStrategy.FixedSize,
      chunkSize: chunkSizeTokens,
      estimatedTokens,
      estimatedCost,
    },
  };
}

/**
 * Strategy 2: Sliding window chunking
 * Pros: ✅ Context preserved at boundaries, better retrieval quality
 * Cons: ❌ More chunks = 15-25% higher cost
 *
 * Best for: Text documents, papers, continuous prose
 */
export function slidingWindowChunk(
  text: string,
  chunkSizeTokens: number = 8,
  overlapTokens: number = 2,
): ChunkedResult {
  const chunks = generateChunksInModeSlidingWindow(
    text,
    chunkSizeTokens,
    overlapTokens,
  );

  const totalChars = text.length;
  const estimatedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);
  const estimatedCost = chunks.length * 0.000002;

  return {
    chunks,
    chunkCount: chunks.length,
    avgChunkSize: Math.round(totalChars / chunks.length),
    metadata: {
      strategy: ChunkStrategy.SlidingWindow,
      chunkSize: chunkSizeTokens,
      overlap: overlapTokens,
      estimatedTokens,
      estimatedCost,
    },
  };
}

/**
 * Strategy 3: Semantic chunking by headers
 * Pros: ✅ Topically coherent chunks, best retrieval quality
 * Cons: ❌ Requires structured documents with headers
 *
 * Best for: Markdown/structured documents, papers with headers
 */
export async function semanticChunk(
  text: string,
  semanticSize: number = 8,
): Promise<ChunkedResult> {
  // const chunks = generateChunksInModeSemantic(text);
  const chunks = await splitTextInModeSemantic(text, semanticSize);

  const totalChars = text.length;
  const estimatedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);
  const estimatedCost = chunks.length * 0.000002;

  return {
    chunks,
    chunkCount: chunks.length,
    avgChunkSize: Math.round(totalChars / chunks.length),
    metadata: {
      strategy: ChunkStrategy.Semantic,
      chunkSize: 0, // Variable size
      estimatedTokens,
      estimatedCost,
    },
  };
}

/**
 * Evaluate and compare all three strategies
 * Returns metrics for cost-quality analysis
 */
export async function evaluateAllStrategies(
  text: string,
  chunkSize: number = 8,
  slidingOverlap: number = 2,
) {
  const fixed = fixedSizeChunk(text, chunkSize);
  const sliding = slidingWindowChunk(text, chunkSize, slidingOverlap);
  const semantic = await semanticChunk(text, chunkSize);

  return {
    text: {
      length: text.length,
      estimatedTokens: Math.ceil(text.length / CHARS_PER_TOKEN),
    },
    strategies: [fixed, sliding, semantic],
    comparison: {
      chunkCounts: {
        fixed: fixed.chunkCount,
        sliding: sliding.chunkCount,
        semantic: semantic.chunkCount,
      },
      costs: {
        fixed: fixed.metadata.estimatedCost,
        sliding: sliding.metadata.estimatedCost,
        semantic: semantic.metadata.estimatedCost,
      },
      costMultipliers: {
        slidingVsFixed: (sliding.chunkCount / fixed.chunkCount).toFixed(2),
        semanticVsFixed: (semantic.chunkCount / fixed.chunkCount).toFixed(2),
      },
      recommendation:
        semantic.chunkCount < fixed.chunkCount
          ? 'semantic (best quality + cost)'
          : 'sliding-window (good balance)',
    },
  };
}
