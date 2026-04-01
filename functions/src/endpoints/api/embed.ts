import { Request, Response } from 'express';
import logger from '../../services/firebase/logger';
import { embeddingService } from '../../services/embedding';

/** Sample: REQ {text: string} | RES {success: boolean, embedding: number[]} */
export const embedHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;

    // Validate request body
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    if (typeof text !== 'string') {
      res.status(400).json({ error: 'Text must be a string' });
      return;
    }

    logger.info('Embed request received', { textLength: text.length });

    // Create embedding
    const embedding = await embeddingService.createEmbedding(text);

    res.json({
      success: true,
      embedding,
      dimensions: embedding.length
    });

  } catch (error) {
    logger.error(`Error in embedHandler: ${error}`);
    res.status(500).json({
      error: (error as any).message || 'Internal server error'
    });
  }
};
