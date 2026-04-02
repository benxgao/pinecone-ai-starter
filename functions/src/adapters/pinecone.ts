import { Pinecone, Index } from '@pinecone-database/pinecone';
import logger from '../services/firebase/logger';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

let pineconeClient: Pinecone | null = null;
let indexClient: Index | null = null;

/** Description: Initialize Pinecone client and get index instance */
export async function getIndex(): Promise<Index> {
  try {
    if (!PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
      throw new Error('Missing required Pinecone environment variables: PINECONE_API_KEY or PINECONE_INDEX_NAME');
    }

    if (!pineconeClient) {
      pineconeClient = new Pinecone({ apiKey: PINECONE_API_KEY! });
    }

    if (!indexClient) {
      indexClient = pineconeClient.index(PINECONE_INDEX_NAME!);

      try {
        /**
         *  Sample:
            stats = {
              dimension: 512,
              totalRecordCount: 1500,
              namespaces:{
                'default':{
                  recordCount: 1500
                }
              },
              indexFullness,
              totalRecordCount
            }
         */
        const stats = await indexClient.describeIndexStats();

        logger.info('Pinecone index connected', {
          indexName: PINECONE_INDEX_NAME,
          dimensions: stats.dimension,
          totalVectorCount: stats.totalRecordCount,
          namespaces: Object.keys(stats.namespaces || {})
        });
      } catch (statsError) {
        logger.warn('Could not retrieve Pinecone index stats', { error: statsError });
      }
    }

    return indexClient;
  } catch (error) {
    logger.error('Error initializing Pinecone client:', { error });
    throw error;
  }
}
