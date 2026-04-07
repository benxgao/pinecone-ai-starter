import { getPineconeClient } from './client';
import { appConstants } from '../../config';

const INDEX_NAME = appConstants.pinecone.defaultIndexName;

/**
 * Get typed index client for upsert/query operations
 * Lazy initializes the index connection
 *
 * @returns Index instance for operations
 */
export function getPineconeIndexClient() {
  return getPineconeClient().index({ name: INDEX_NAME });
}

/**
 * Get the configured index name
 *
 * @returns Current index name
 */
export function getPineconeIndexName(): string {
  return INDEX_NAME;
}
