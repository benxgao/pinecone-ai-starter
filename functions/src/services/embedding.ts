import { openAIAdapter } from '../adapters/openai';
import logger from '../services/firebase/logger';

/** Description: Embedding service for text vectorization | Sample: IN "hello world" -> OUT [0.1, 0.2, ...] */
export class EmbeddingService {
  /** Creates embedding vector from text input with validation and error handling */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      // Input validation
      if (!text || typeof text !== 'string') {
        throw new Error('Text must be a non-empty string');
      }

      const trimmedText = text.trim();
      if (trimmedText.length === 0) {
        throw new Error('Text cannot be empty or whitespace only');
      }

      // Rate limit protection: enforce max length
      if (trimmedText.length > 8000) {
        throw new Error('Text too long (max 8000 characters)');
      }

      logger.info('Creating embedding', {
        textLength: trimmedText.length,
        firstChars: trimmedText.substring(0, 50)
      });

      // Create embedding using OpenAI adapter
      const embedding = await openAIAdapter.createEmbedding(trimmedText);

      logger.info('Embedding created successfully', {
        dimensions: embedding.length,
        textLength: trimmedText.length
      });

      return embedding;
    } catch (error) {
      logger.error(`Error in EmbeddingService.createEmbedding: ${error}`);
      throw error; // Re-throw to let caller handle
    }
  }

  /** Get embedding model information */
  getModelInfo(): { model: string; dimensions: number } {
    return openAIAdapter.getModelInfo();
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
