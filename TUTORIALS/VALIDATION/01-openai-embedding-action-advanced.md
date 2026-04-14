---
description: Action Steps of Advanced Task 01
reference: [Task 01](../../advanced/01-openai-embedding-task-advanced.md)
---

## Phase 1: Setup (5 min)

- [x] Install OpenAI SDK: `cd functions && npm install openai`
- [x] Create `.env` file in `functions/` with `OPENAI_API_KEY=sk-...`
- [x] Verify: `npm run dev` starts without errors

## Phase 2: Create OpenAI Service (10 min)

**File:** `src/services/openai/index.ts`

```typescript
export function getOpenAIClient(): OpenAI;
export function resetOpenAIClient(): void;
```

**Key implementation points:**

- Use singleton pattern (create once, reuse)
- Validate `OPENAI_API_KEY` environment variable
- Set timeout (30s) and retry (2x) for resilience
- Initialize with connection pooling for efficiency

## Phase 2.5: Create OpenAI Adapter (10 min)

**File:** `src/adapters/openai.ts`

```typescript
export class OpenAIAdapter {
  async createEmbedding(text: string): Promise<number[]>;
  getModelInfo(): { model: string; dimensions: number };
  estimateTokens(text: string): number;
  estimateCost(text: string): number;
}

export const openAIAdapter = new OpenAIAdapter();
```

**Key implementation points:**

- Model: `text-embedding-3-small` (1536 dimensions)
- Validate text input (not empty, max 100K chars)
- Error handling: Dimension validation, API error transformation
- Utilities: Token estimation (~1 token per 4 chars), cost calculation ($0.02 per 1M tokens)

## Phase 3: Create Embedding Service (15 min)

**File:** `src/services/embedding.ts`

```typescript
export class EmbeddingService {
  async createEmbedding(text: string): Promise<number[]>;
  getModelInfo(): { model: string; dimensions: number };
  async createEmbeddingWithMetrics(text: string): Promise<{
    embedding: number[];
    tokens: number;
    cost: number;
    duration: number;
  }>;
  async createEmbeddingsBatch(
    texts: string[],
    delayMs?: number,
  ): Promise<number[][]>;
}

export const embeddingService = new EmbeddingService();
```

**Key implementation points:**

- Input validation: non-empty string, max 100K chars
- Wraps OpenAI adapter with error handling and logging
- `createEmbeddingWithMetrics()`: Returns embedding + token count + cost + duration
- `createEmbeddingsBatch()`: Rate-limited batch processing with configurable delay

## Phase 4: Create API Endpoint (10 min)

**File:** `src/endpoints/api/embed.ts`

```typescript
export const embedHandler = async (req: Request, res: Response): Promise<void>
```

**Endpoint:** `POST /api/embed`

**Request:** `{ text: string }`

**Response:** `{ success: boolean, text: string, embedding: number[], dimensions: number, model: string, estimatedCost: number }`

**Key implementation points:**

1. Validate text field exists and is string
2. Enforce 100K character limit before processing
3. Call `embeddingService.createEmbedding(text)`
4. Return embedding with metadata (dimensions, model, cost)
5. Error handling: Return 400 for validation errors, 500 for server errors

**Update:** `src/endpoints/api/index.ts` - Import and register endpoint

**Update:** `src/endpoints/index.ts` - Add `/api` route to main router

## Phase 5: Test (10 min)

**Test 1: Basic functionality**

```bash
cd functions
npm run dev

# In another terminal:
curl -X POST http://localhost:5000/api/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Embeddings are vector representations of text"}'

# Expected response:
# {
#   "success": true,
#   "text": "Embeddings are vector representations of text",
#   "embedding": [0.1234, -0.5678, ...],
#   "dimensions": 1536,
#   "model": "text-embedding-3-small",
#   "estimatedCost": 0.000001
# }
```

**Test 2: Multiple texts (verify consistency)**

```bash
# Same text should produce same embedding
curl -X POST http://localhost:5000/api/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "What is machine learning?"}'

curl -X POST http://localhost:5000/api/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "What is machine learning?"}'

# Both should have identical embedding vectors
```

**Test 3: Batch embeddings (advanced feature)**

```bash
# Test with multiple different texts
curl -X POST http://localhost:5000/api/embed -d '{"text": "AI"}' -H "Content-Type: application/json"
curl -X POST http://localhost:5000/api/embed -d '{"text": "Machine learning is a subset of artificial intelligence"}' -H "Content-Type: application/json"
curl -X POST http://localhost:5000/api/embed -d '{"text": "How do neural networks learn from data?"}' -H "Content-Type: application/json"
```

**Test 4: Error cases**

```bash
# Missing text
curl -X POST http://localhost:5000/api/embed \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400 error "text field required in request body"

# Empty text
curl -X POST http://localhost:5000/api/embed \
  -H "Content-Type: application/json" \
  -d '{"text": ""}'
# Expected: 500 error "Text cannot be empty or whitespace only"

# Text too long
curl -X POST http://localhost:5000/api/embed \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$(printf 'x%.0s' {1..100001})\"}"
# Expected: 400 error "text exceeds 100,000 character limit"
```

**Success criteria:**

- ✅ Returns 1536-dimensional array
- ✅ All values between -1 and 1
- ✅ Same text → same embedding (deterministic)
- ✅ Different text → different embedding
- ✅ Error messages are clear and helpful
- ✅ Response time < 500ms per request
- ✅ Logs show embedding metrics (tokens, cost, duration)

## Phase 6: Documentation & Advanced Features (10 min)

**Update tutorial:** `docs/ai_tutorials/01-embeddings.md`

Add sections:

- "How OpenAI Integration Works" - Explain singleton pattern, connection pooling
- "Error Handling Patterns" - Document validation and error transformation
- "Rate Limiting & Cost Tracking" - Explain token estimation, cost calculation
- "Batch Processing" - Show example of `createEmbeddingsBatch()` usage

**Advanced features already implemented:**

1. **Metrics Tracking** - Use `createEmbeddingWithMetrics()` to get token count, cost, and duration

   ```typescript
   const { embedding, tokens, cost, duration } =
     await embeddingService.createEmbeddingWithMetrics(text);
   ```

2. **Batch Processing** - Process multiple texts with rate limiting

   ```typescript
   const embeddings = await embeddingService.createEmbeddingsBatch(
     ["text1", "text2", "text3"],
     100, // 100ms delay between requests
   );
   ```

3. **Model Info** - Get model details

   ```typescript
   const { model, dimensions } = embeddingService.getModelInfo();
   // { model: 'text-embedding-3-small', dimensions: 1536 }
   ```

4. **Comprehensive Logging** - All operations logged via Firebase logger
   - Embedding creation start/completion
   - Token estimates and cost
   - Error details with stack traces

**Checklist:**

- [ ] Verify OpenAI adapter is initialized before first request
- [ ] Test batch embedding with 5+ texts
- [ ] Check logs show token estimation and cost tracking
- [ ] Verify error messages are specific to failure type
- [ ] Update tutorial with integration examples
