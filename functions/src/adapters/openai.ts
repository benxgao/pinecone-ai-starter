import OpenAI from 'openai';
import { appConfig } from '../config';
import logger from '../services/firebase/logger';
import { EmbeddingError } from '../types/errors';

/**
 * Singleton OpenAI client
 *
 * Why singleton?
 * - Connection pooling: Reuses HTTP connections
 * - Rate limit awareness: Single point for tracking limits
 * - Cost tracking: Centralized token counting
 * - Thread-safe: One client per process
 */
let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = appConfig.openai.apiKey;

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable not set. ' +
        'Add to .env file: OPENAI_API_KEY=sk-...'
      );
    }

    if (!apiKey.startsWith('sk-')) {
      throw new Error(
        'OPENAI_API_KEY looks invalid. ' +
        'Should start with "sk-". Check your .env file.'
      );
    }

    client = new OpenAI({
      apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 2,  // Retry on transient failures
    });

    logger.info('✓ OpenAI client initialized');
  }

  return client;
}

/**
 * Reset client (useful for testing)
 */
export function resetOpenAIClient(): void {
  client = null;
}

/** Description: OpenAI embedding adapter | Sample: IN "hello world" -> OUT [0.1, 0.2, ...] */
export class OpenAIAdapter {
  private model = 'text-embedding-3-small';
  private dimensions = 1536;

  /** Creates embedding vector from text input */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Text input cannot be empty');
      }

      // Rate limit protection: check text length
      if (text.length > 100000) {
        throw new Error(`Text input too long (max 100,000 characters). Got ${text.length}`);
      }

      logger.info('Creating embedding', { textLength: text.length, model: this.model });

      const response = await getOpenAIClient().embeddings.create({
        model: this.model,
        input: text.trim(),
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;

      if (!embedding || embedding.length === 0) {
        throw new Error('Empty embedding returned from API');
      }

      if (embedding.length !== this.dimensions) {
        throw new Error(
          `Invalid embedding dimensions: ${embedding.length}. ` +
          `Expected ${this.dimensions}.`
        );
      }

      logger.info('Embedding created successfully', {
        dimensions: embedding.length,
        model: this.model
      });

      return embedding;
    } catch (error) {
      logger.error(`Error in OpenAIAdapter.createEmbedding: ${error}`);
      throw new EmbeddingError(`Failed to create embedding: ${(error as any).message}`, error);
    }
  }

  /** Get embedding model info */
  getModelInfo(): { model: string; dimensions: number } {
    return {
      model: this.model,
      dimensions: this.dimensions,
    };
  }
}

// Export singleton instance
export const openAIAdapter = new OpenAIAdapter();

// Export client getter for direct access if needed
export { getOpenAIClient };
