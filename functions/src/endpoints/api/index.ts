import { Router as createRouter } from 'express';
import { verifyFirebaseToken } from '../../middlewares/firebase-auth';
import {embedHandler} from './embed';

import protectedResources from './protected-resources';

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

// Not related
router.post('/protected-resources', verifyFirebaseToken, protectedResources);

export default router;

