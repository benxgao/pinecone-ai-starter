import { Router as createRouter } from 'express';
import { embedHandler } from './embed';
import { upsertHandler, sampleUpsertDataHandler } from './upsert';
import { searchHandler, sampleSearchQueriesHandler } from './search';

const router = createRouter();


/**
 * Sample request:
 *
  curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/embed \
  -H "Content-Type: application/json" \
  -H "auth_token: some_value" \
  -d '{"text": "hello world"}'
 */
router.post('/embed', embedHandler);

/**
 * Upsert documents to Pinecone index
 *
 * Sample request:
 *
  curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/upsert \
  -H "Content-Type: application/json" \
  -H "auth_token: some_value" \
  -d '{
    "documents": [
      {
        "id": "doc-1",
        "text": "Sample document",
        "metadata": { "source": "test" }
      }
    ]
  }'
 */
router.post('/upsert', upsertHandler);

/**
 * Get sample test data for upsert
 *
 * Sample request:
 *
  curl -X GET http://localhost:5001/YOUR_PROJECT/us-central1/upsert/sample \
  -H "auth_token: some_value"
 */
router.get('/upsert/sample', sampleUpsertDataHandler);

/**
 * Search for similar documents using semantic similarity
 *
 * Sample request:
 *
  curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/search \
  -H "Content-Type: application/json" \
  -H "auth_token: some_value" \
  -d '{
    "query": "What is machine learning?",
    "topK": 3
  }'
 */
router.post('/search', searchHandler);

/**
 * Get sample search queries for testing
 *
 * Sample request:
 *
  curl -X GET http://localhost:5001/YOUR_PROJECT/us-central1/search/sample \
  -H "auth_token: some_value"
 */
router.get('/search/sample', sampleSearchQueriesHandler);


export default router;

