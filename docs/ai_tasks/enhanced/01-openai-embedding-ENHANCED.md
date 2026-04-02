# Task 01 — OpenAI Embedding [ENHANCED]

## Goal

Create a function that transforms text into semantic vector embeddings using OpenAI's embedding model, understanding how embeddings enable AI applications.

---

## Learning Outcomes

After completing this task, you'll understand:
- **What embeddings are** — Numerical representations that capture semantic meaning
- **Why embeddings enable semantic search** — Beyond simple keyword matching
- **How to integrate OpenAI API from TypeScript** — Production-grade client patterns
- **Error handling and resilience** — Rate limits, auth failures, retries
- **Cost management** — Token counting and pricing implications
- **Dimension and model selection** — Why 1536 dimensions for text-embedding-3-small
- **Singleton pattern for expensive resources** — Client initialization best practice

---

## Requirements

**Input:**
- `text`: string (natural language text, e.g., "What is machine learning?")

**Output:**
- `embedding`: number[] array
  - Type: 1536-dimensional vector
  - Format: normalized float values in range [-1, 1]
  - Properties: Captures semantic meaning of input text

**Model Selection:**
- Model: `text-embedding-3-small`
- Dimensions: 1536
- Cost: $0.02 per 1M tokens
- Speed: ~100ms per request
- Why this model: Good balance of cost vs quality for RAG systems

---

## Why Embeddings Matter

### The Problem: Keyword Search Limitations

```
Traditional keyword search:
Query: "machine learning"
Doc A: "ML is teaching computers to learn"
Doc B: "The teaching profession requires patience"
Match score: Same (both have "teaching")
Result: ❌ False positive (Doc B irrelevant)
```

### The Solution: Semantic Search with Embeddings

```
Semantic search:
Query: "machine learning" → [0.1, -0.2, 0.3, ..., 0.5]
Doc A: "ML is teaching computers..." → [0.11, -0.19, 0.31, ..., 0.48]
Doc B: "The teaching profession..." → [-0.4, 0.8, -0.2, ..., -0.3]

Similarity A: 0.95 ✅ (very similar meaning)
Similarity B: 0.15 ❌ (different meaning, despite keyword match)
```

**Result:** Embeddings understand meaning, not just keywords.

---

## Implementation

**Files to create:**
```
/src/adapters/openai.ts      # Client initialization
/src/services/embedding.ts   # Embedding business logic
```

**Functions:**
```typescript
// openai.ts
export function getOpenAIClient(): OpenAI

// embedding.ts
export async function createEmbedding(text: string): Promise<number[]>
export function estimateTokens(text: string): number
export function estimateCost(text: string): number
```

---

## Implementation Guide

### Step 1: Create OpenAI client adapter

```typescript
// src/adapters/openai.ts
import OpenAI from 'openai';

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

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    
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
    
    console.log('✓ OpenAI client initialized');
  }
  
  return client;
}

/**
 * Reset client (useful for testing)
 */
export function resetOpenAIClient(): void {
  client = null;
}
```

### Step 2: Implement embedding service

```typescript
// src/services/embedding.ts
import { getOpenAIClient } from '../adapters/openai';

/**
 * Create embedding for text using OpenAI
 * 
 * Process:
 * 1. Validate input
 * 2. Get OpenAI client
 * 3. Call embeddings API
 * 4. Return embedding vector
 * 5. Handle errors gracefully
 */
export async function createEmbedding(text: string): Promise<number[]> {
  // Validation
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }
  
  const trimmedText = text.trim();
  
  if (trimmedText.length > 100000) {
    throw new Error(
      `Text too long: ${trimmedText.length} chars. Max 100,000 chars.`
    );
  }
  
  try {
    const client = getOpenAIClient();
    
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: trimmedText,
      encoding_format: 'float',
    });
    
    // Extract embedding from response
    const embedding = response.data[0].embedding;
    
    if (!embedding || embedding.length === 0) {
      throw new Error('Empty embedding returned from API');
    }
    
    if (embedding.length !== 1536) {
      throw new Error(
        `Invalid embedding dimensions: ${embedding.length}. ` +
        'Expected 1536.'
      );
    }
    
    return embedding;
  } catch (error) {
    // Transform error into helpful message
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        throw new Error(
          'Rate limited by OpenAI. Wait 60 seconds before retrying. ' +
          'Upgrade plan at https://platform.openai.com/account/billing/overview'
        );
      }
      
      if (error.message.includes('401')) {
        throw new Error(
          'Authentication failed. Invalid OPENAI_API_KEY. ' +
          'Check your .env file and API key at ' +
          'https://platform.openai.com/api-keys'
        );
      }
      
      if (error.message.includes('timeout')) {
        throw new Error(
          'Request timeout. OpenAI API took too long. ' +
          'Try again or contact OpenAI support.'
        );
      }
    }
    
    throw error;
  }}

/**
 * Estimate tokens in text (rough approximation)
 * 
 * Rule of thumb: 4 characters ≈ 1 token
 * This is approximate; actual token count from API may vary
 */
export function estimateTokens(text: string): number {
      return Math.ceil(text.length / 4);
    
}

/**
 * Estimate cost of embedding request
 * 
 * Pricing: $0.02 per 1M input tokens
 */
export function estimateCost(text: string): number {
  const tokens = estimateTokens(text);
  const costPerToken = 0.02 / 1_000_000; // $0.02 per 1M tokens
  return tokens * costPerToken;
    
}

/**
 * Create embedding with detailed logging and cost tracking
 */
export async function createEmbeddingWithMetrics(
  text: string
    
): Promise<{
  embedding: number[];
  tokens: number;
  cost: number;
  duration: number; // milliseconds
    
}> {
  const startTime = Date.now();
  const tokens = estimateTokens(text);
  const cost = estimateCost(text);
  
  console.log(`📝 Embedding text: ${text.substring(0, 50)}...`);
  console.log(`   Tokens: ~${tokens}`);
  console.log(`   Cost: ~$${cost.toFixed(6)}`);
  
  const embedding = await createEmbedding(text);
  const duration = Date.now() - startTime;
  
  console.log(`✓ Embedding created in ${duration}ms`);
  
  return { embedding, tokens, cost, duration };
}

/**
 * Batch create embeddings (for efficiency)
 * Note: Currently processes sequentially with rate limiting
 */
export async function createEmbeddingsBatch(
  texts: string[],
  delayMs: number = 100
    
): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    embeddings.push(await createEmbedding(text));
    
    // Rate limiting: space out requests
    if (texts.indexOf(text) < texts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    
    }
  }
  
  return embeddings;
}
```

### Step 3: Create API endpoint

```typescript
// src/endpoints/api/embed.ts
import { Router, Request, Response } from 'express';
import { createEmbedding, estimateCost } from '../../services/embedding';

const router = Router();

/**
 * POST /api/embed
 * 
 * Request body:
 * {
 *   \"text\": \"What is machine learning?\"
 * }
 * 
 * Response:
 * {
 *   \"text\": \"What is machine learning?\",
 *   \"embedding\": [0.1, -0.2, 0.3, ...],  // 1536 dimensions
 *   \"dimensions\": 1536,
 *   \"estimatedCost\": 0.000001
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  const { text } = req.body;
  
  // Validation
  if (!text) {
    return res.status(400).json({
      error: 'text field required in request body',
    
    });
  }
  
  if (typeof text !== 'string') {
    return res.status(400).json({
      error: 'text must be a string',
    
    });
  }
  
  if (text.length > 100000) {
    return res.status(400).json({
      error: 'text exceeds 100,000 character limit',
    });
  }
  
  try {
    const embedding = await createEmbedding(text);
    
    return res.json({
      text: text.substring(0, 100), // Echo back (truncated)
      embedding,
      dimensions: embedding.length,
      estimatedCost: estimateCost(text),
    
    });
  } catch (error) {
    console.error('Embedding error:', error);
    
    if (error instanceof Error) {
      // Return user-friendly error
      return res.status(500).json({
        error: error.message,
      });
    }
    
    return res.status(500).json({
      error: 'Failed to create embedding',
    });
  }
});

export default router;
```

---

## Testing

### Test 1: Basic functionality

```bash
# Start dev server
npm run dev

# In another terminal, test embedding endpoint
curl -X POST http://localhost:5000/api/embed \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"text\": \"Embeddings are vector representations of text\"
    
  }'

# Expected response:
# {
#   \"text\": \"Embeddings are vector representations of text\",
#   \"embedding\": [0.123, -0.456, 0.789, ...],  1536 values
#   \"dimensions\": 1536,
#   \"estimatedCost\": 0.00000125
# }
```
 
### Test 2: Multiple different texts

```bash
# Test 1: Short text
curl -X POST http://localhost:5000/api/embed \\
  -d '{\"text\": \"AI\"}'

# Test 2: Long text (paragraph)
curl -X POST http://localhost:5000/api/embed \\
  -d '{\"text\": \"Machine learning is a subset of artificial intelligence...\"}'

# Test 3: Technical content
curl -X POST http://localhost:5000/api/embed \\
  -d '{\"text\": \"Vector databases use HNSW indexing for semantic search\"}'

# Test 4: Question
curl -X POST http://localhost:5000/api/embed \\
  -d '{\"text\": \"How do neural networks learn from data?\"}'
```

### Test 3: Error cases

```bash
# Missing text field
curl -X POST http://localhost:5000/api/embed \\
  -d '{}'
# Expected: 400 error \"text field required\"

# Empty text
curl -X POST http://localhost:5000/api/embed \\
  -d '{\"text\": \"\"}'
# Expected: 400 error \"Text cannot be empty\"

# Invalid API key (in .env)
# Expected: 401 error about authentication
```

**Success criteria:**
- ✅ Returns array of 1536 numbers
- ✅ All values between -1 and 1
- ✅ Same text always produces same embedding
- ✅ Similar texts produce similar embeddings
- ✅ Error messages are helpful
- ✅ Response time < 500ms

---

## Embedding Fundamentals

### What is an Embedding?

**Simple definition:** A list of numbers that represents the meaning of text.

```
Text: \"machine learning\"
     ↓ (embedding model)
Vector: [0.123, -0.456, 0.789, ..., 0.234]
        └─ 1536 dimensions ─┘

Properties:
- Same text → Same embedding
- Similar texts → Similar embeddings
- Different texts → Different embeddings
```

### How Embeddings Capture Meaning

```
Embeddings are trained on massive text corpora.
They learn:
- Semantic relationships (\"king\" - \"man\" + \"woman\" ≈ \"queen\")
- Topic associations (ML terms cluster together)
- Similarity patterns (similar ideas → similar vectors)

Result: Numbers encode meaning
```

### Dimensions Explained

**Why 1536 dimensions?**

```
More dimensions = More capacity for meaning

1 dimension:    [0.5]              ← Can only represent 1 bit of info
10 dimensions:  [0.1, 0.2, ...]    ← More nuanced
1536 dimensions: [0.123, -0.456, ...] ← Very detailed

OpenAI chose 1536 as sweet spot:
- Enough dimensions to capture fine-grained meaning
- Not so many as to be computationally expensive
- Works well for semantic search
```

---

## Cost Analysis

### Pricing

```
OpenAI text-embedding-3-small:
$0.02 per 1 million input tokens

For comparison:
- GPT-3.5-turbo: $0.50 per 1M input tokens (25x more expensive)
- text-embedding-3-large: $0.08 per 1M tokens (4x more)
```

### Token Counting

```typescript
// Rough formula: 4 characters ≈ 1 token

Examples:
- \"hello\" (5 chars) ≈ 2 tokens
- \"machine learning\" (15 chars) ≈ 4 tokens  
- \"The quick brown fox...\" (50 chars) ≈ 13 tokens

For accurate counts, use OpenAI's tokenizer
But 4x rule is good enough for estimation
```

### Cost Examples

```
100 chars (25 tokens)  ≈ $0.0000005 ← Negligible
1000 chars (250 tokens) ≈ $0.000005 ← Still negligible
10000 chars (2500 tokens) ≈ $0.00005 ← Very cheap

→ Embeddings are cheaper than LLM calls by 25x
→ For RAG, embedding cost is rarely a bottleneck
```

---

## Common Patterns

### Pattern 1: With validation and logging

```typescript
export async function createEmbeddingWithValidation(
  text: string,
  maxLength: number = 8192
  
): Promise<number[]> {
// Validate
  if (!text?.trim()) {
    throw new Error('Text cannot be empty');
  
  }
  
  if (text.length > maxLength) {
    throw new Error(
      `Text too long: ${text.length} chars. Max: ${maxLength} chars`
  
    );
  }
  
  // Log
  console.log(`Creating embedding for ${text.length} chars`);
  
  // Create
  return await createEmbedding(text);
}
```

### Pattern 2: With retry logic for transient failures

```typescript
export async function createEmbeddingWithRetry(
  text: string,
  maxRetries: number = 3,
  delayMs: number = 1000
  
): Promise<number[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await createEmbedding(text);
  
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry auth errors
      if (lastError.message.includes('401')) {
        throw lastError;
  
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        console.warn(
          `Attempt ${attempt} failed. Retrying in ${delayMs}ms...`
  
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error(
    `Failed after ${maxRetries} attempts: ${lastError?.message}`
  
  );
}
```

### Pattern 3: Batch with rate limiting

```typescript
export async function createEmbeddingsBatchRateLimited(
  texts: string[],
  requestsPerSecond: number = 10
  
): Promise<number[][]> {
  const delayMs = 1000 / requestsPerSecond;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i++) {
    embeddings.push(await createEmbedding(texts[i]));
    
    // Rate limiting
    if (i < texts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
  
    }
    
    // Progress
    if ((i + 1) % 10 === 0) {
      console.log(`Embedded ${i + 1}/${texts.length}`);
    }
  }
  
  return embeddings;
}
```

---

## Error Handling Reference

| Error | Cause | Solution | Retry? |
|-------|-------|----------|--------|
| \"OPENAI_API_KEY not set\" | Missing env var | Add to .env | No |
| \"401 Unauthorized\" | Invalid API key | Check OpenAI dashboard | No |
| \"429 Too Many Requests\" | Rate limited | Wait or upgrade plan | Yes (wait 60s) |
| \"timeout\" | Request took >30s | Reduce text length or try again | Yes |
| \"Empty embedding\" | API returned empty | Contact OpenAI support | Yes |
| \"Invalid dimensions\" | Wrong embedding size | Check model (should be 1536) | No |

---

## Performance Optimization

### Latency

```
Typical latency: 100-300ms per request
- Network: 50-100ms
- OpenAI processing: 50-150ms
- JSON parsing: <1ms

Optimization:
- Batch requests (though individually still sequential)
- Use connection pooling (built into client)
- Reduce text length where possible
```

### Throughput

```
Rate limits (free tier):
- 20 requests per minute
- 3 million tokens per month

Rate limits (paid tier):
- Higher limits depending on usage tier
- Check OpenAI dashboard for your limits

How to handle:
- Batch process with delays
- Queue requests
- Cache embeddings (don't re-embed same text)
```

---

## Constraints

- Single request at a time (no parallel requests yet)
- Text input only (images via separate model)
- Max 8,192 tokens per request
- Requires valid OPENAI_API_KEY
- Rate limits apply (dependent on plan)

---

## Troubleshooting

### \"OPENAI_API_KEY not set\"d

```
❌ Problem:
  Error: OPENAI_API_KEY environment variable not set

✅ Solution:
  1. Create .env file in functions/ directory
  2. Add: OPENAI_API_KEY=sk-...
  3. Get key from https://platform.openai.com/api-keys
  4. Restart dev server: npm run dev
```

### \"401 Unauthorized\"

```
❌ Problem:
  Authentication failed. Invalid OPENAI_API_KEY.

✅ Solution:
  1. Check OpenAI dashboard: https://platform.openai.com/api-keys
  2. Verify key hasn't been revoked
  3. Create new key if needed
  4. Copy exactly (no extra spaces)
  5. Test with: curl -H \"Authorization: Bearer $KEY\" ...
```

### \"429 Too Many Requests\"

```
❌ Problem:
  Rate limited by OpenAI API

✅ Solutions:
  Short term: Wait 60 seconds before retrying
  Long term: Upgrade your OpenAI plan
  Immediate: Cache embeddings to avoid re-embedding
  
How to avoid:
  - Batch requests with delays (200ms between)
  - Don't embed same text twice
  - Use request queuing
```

### \"timeout\"

```
❌ Problem:
  Request took longer than 30 seconds

✅ Solutions:
  1. Reduce text length (fewer tokens = faster)
  2. Retry (may be temporary slowness)
  3. Check network connection
  4. Try again during off-peak hours
```

---

## Next Steps

**After this task:**
1. Move to Task 02 to store embeddings in Pinecone
2. Task 03 will combine embedding + storage
3. Task 04 will use embeddings for search

**To deepen understanding:**
- Read OpenAI embedding docs: https://platform.openai.com/docs/guides/embeddings
- Experiment with different texts and observe embedding similarity
- Try text-embedding-3-large to see difference in quality

---

## Tutorial Trigger

- **embeddings.md** → Fill \"How\" section with OpenAI integration patterns

Tutorial focus:
- What = Embeddings: numerical representations of semantic meaning
- Why = Enables semantic search (beyond keyword matching)
- How = OpenAI API integration with singleton client pattern
- Gotchas = Rate limits, token costs, dimension validation, error handling
- Trade-offs = Cost vs quality (small vs large models)

