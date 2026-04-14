---
notes: Training tutorial - focus on data preparation and loading concepts
---

# Tutorial 03 — Preparing and Loading Data

## What You'll Learn

In this tutorial, you'll understand:

- **Data preparation workflow** — Steps to get raw documents ready for search
- **Batch processing principles** — Why and how to process data efficiently
- **Metadata preservation** — Keeping context information with your data
- **Cost estimation and tracking** — Understanding the expenses of scale
- **Error handling and reliability** — Making data loading robust
- **Validation and verification** — Ensuring data quality and integrity
- **Real-world data patterns** — Working with different document sources

---

## The Big Picture: From Documents to Searchable Vectors

### The Three Components

You have:

1. **Documents with text** — your source material (research papers, product docs, etc.)
2. **Embedding model** — transforms text → numbers
3. **Vector database** — stores and searches the numbers

The challenge: Moving data from component 1 through components 2 and 3 efficiently and reliably.

### The Basic Flow

```
Raw Documents
    ↓
Validation & Cleaning
    ↓
Chunking (if needed)
    ↓
Vectorization (embedding)
    ↓
Batching & Optimization
    ↓
Storage & Indexing
```

---

## Step 1: Data Collection and Preparation

### Where Does Data Come From?

- **Files:** JSON, CSV, plain text, PDFs
- **Databases:** SQL queries, document stores
- **APIs:** Real-time data feeds, web services
- **Hybrid:** Mix of sources

### Data Validation

Before processing, validate your data:

**Completeness**

- Does each document have required fields (title, content, etc.)?
- Are there any missing or null values?

**Format Consistency**

- Are all documents in the expected structure?
- Can you parse them correctly?

**Content Quality**

- Is the text readable and valid?
- Are there encoding issues or corrupted characters?

Why this matters: Processing invalid data wastes money on embeddings and produces poor search results.

---

## Step 2: Understanding Deduplication

### The Problem

In real-world data:

- Documents sometimes appear multiple times
- Same content from different sources
- Slightly different versions of the same document

### The Solution

Before embedding, check if you've already processed this document:

1. Create a unique identifier for each document (could be based on content, filename, URL, etc.)
2. Track which documents you've already embedded
3. Skip already-processed documents
4. Only embed new ones

This saves money and prevents index bloat.

### Cost Impact

Suppose you have 10,000 documents:

- Without deduplication: Embed all 10,000
- After deduplication: Maybe only embed 9,200 (800 were duplicates)
- Savings: 8% of embedding costs

For large datasets, these savings compound.

---

## Step 3: Batch Processing for Efficiency

### Why Batch Processing Matters

**Processing one document at a time:**

- Embed one document
- Send to database
- Wait for confirmation
- Move to next document

Results: Slow with many network round trips.

**Batch processing (better approach):**

- Group 32-128 documents into a batch
- Embed entire batch together
- Send all to database at once
- Move to next batch

Results: Much faster, fewer network calls, better resource use.

```typescript
// Pseudocode for batch processing
async function processBatch(documents: Document[]): Promise<void>;
async function embedBatch(documents: Document[]): Promise<Embedding[]>;
async function upsertBatch(vectors: Vector[]): Promise<void>;
```

### Batch Size Trade-offs

- **Small batches (8-16):** Lower memory usage, more flexible
- **Medium batches (32-128):** Sweet spot for most scenarios
- **Large batches (256+):** Very efficient but needs more RAM

Choose based on your system's resources and latency requirements.

---

## Step 4: Metadata Preservation

### What is Metadata?

Information about your data beyond the text content:

- **Document ID** — Unique identifier for retrieval
- **Source** — Where this document came from
- **Chunk number** — If split into pieces, which part is this?
- **Original URL** — Link to the source
- **Author/Date** — Context information
- **Category/Tags** — Classification

### Why Metadata Matters

When your system finds a relevant vector and returns it to the user, you need metadata to:

- Tell the user where the information came from
- Provide links or attribution
- Filter results (e.g., "only show results from 2024")
- Debug why a result was retrieved

Without metadata, retrieved vectors are meaningless.

---

## Step 5: Cost Tracking and Estimation

### Cost Components

**Embedding costs** — Charged per token processed
**Storage costs** — Charged per vector stored
**Query costs** — Charged per search operation

### Estimation Before Processing

Before upserting your entire dataset, estimate the cost:

1. Sample 10% of your documents
2. Calculate average tokens per document
3. Multiply by total documents
4. Use pricing to estimate cost
5. Make a decision: proceed or adjust strategy

This prevents nasty surprises where you process 500K documents and get a huge bill.

### Cost Optimization

**Strategy 1: Compress Text**

- Remove redundant content
- Summarize long documents
- Might reduce embedding cost by 20-30%
- Trade-off: Might lose detail

**Strategy 2: Use Cheaper Models**

- Smaller embedding models
- Lower cost per token
- Trade-off: Slightly lower quality

**Strategy 3: Selective Embedding**

- Only embed most important documents
- Use keyword indexing for others
- Trade-off: Reduced coverage

---

## Error Handling and Recovery

### Common Failures

**API Rate Limiting**

- Embedding API rejects requests temporarily
- Solution: Pause, wait, and retry

**Network Timeouts**

- Connection drops mid-operation
- Solution: Checkpoint progress, resume from last successful batch

**Invalid Documents**

- Corrupted text, encoding issues
- Solution: Skip invalid items, log for investigation

### Recovery Patterns

**Strategy 1: Checkpointing**

- Save progress after each batch
- If failure occurs, resume from checkpoint
- Prevents re-processing completed work

**Strategy 2: Idempotency**

- Processing the same batch twice gives same result
- Safe to retry without side effects

**Strategy 3: Partial Success**

- If 1 document out of 100 fails, still process the 99 others
- Log failures separately
- Don't halt entire process

---

## Step 6: Verification

### Sanity Checks

After loading data:

1. **Count check** — Did all documents get loaded?
2. **Randomness check** — Sample retrieval (search for random document) works?
3. **Quality check** — Spot-check a few search results. Do they make sense?
4. **Completeness check** — Did metadata get preserved correctly?

### Monitoring

After deployment, continuously track:

- Number of indexed documents
- Index growth over time
- Search latency
- Error rates

---

## Key Takeaways

The three critical steps for data loading:

1. **Load & Validate** — Read documents from source, validate structure and content
2. **Embed & Batch** — Convert text to vectors in batches, track costs
3. **Verify & Monitor** — Confirm all data loaded, track metrics over time

Key functions to implement:

```typescript
// Load documents from various sources
function loadDocumentsFromJSON(filePath: string): Promise<Document[]>;
function loadDocumentsFromCSV(filePath: string): Promise<Document[]>;
function loadDocumentsFromAPI(url: string): Promise<Document[]>;

// Embedding and batching
function embedDocuments(documents: Document[]): Promise<Embedding[]>;
function upsertBatch(vectors: Vector[], batchSize?: number): Promise<void>;

// Track and verify
function verifyDocumentsLoaded(count: number): boolean;
function calculateCosts(documentCount: number): Promise<CostEstimate>;
```

**Benefits of proper data loading:**

- ✅ Handles 100K+ documents efficiently
- ✅ Resume from failures using checkpoints
- ✅ Cost tracking before you run
- ✅ Progress tracking and visibility
- ✅ Metadata preserved throughout
  vectors: UpsertVector[],
  batchSize: number = 100,
  ): Promise<{ upsertedCount: number; failedIds: string[] }>

/\*\*

- Complete upsert pipeline
  \*/
  export async function upsertDocuments(
  documents: Document[],
  options: UpsertOptions = {},
  ): Promise<UpsertMetrics>

````

---

### Step 4: CLI Integration

**File:** `src/commands/upsert.ts`

```typescript
import { loadDocumentsFromJSON } from '../services/document-loader';
import { upsertDocuments } from '../services/upsert';

// Usage: npx ts-node src/commands/upsert.ts <file.json>
async function main(): Promise<void>
````

**Key steps:**

1. Parse command-line arguments for file path
2. Validate and load JSON documents
3. Call `upsertDocuments()` with batch configuration
4. Display metrics (loaded, embedded, upserted, costs)
5. Handle and report errors

---

## Testing

### Test 1: Load and Upsert Sample Documents

```bash
# Create sample documents
cat > sample-docs.json << 'EOF'
[
  {
    "id": "doc-1",
    "text": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.",
    "metadata": { "source": "ai-intro", "difficulty": "beginner" }
  },
  {
    "id": "doc-2",
    "text": "Embeddings are numerical representations of text that capture semantic meaning. They allow us to perform similarity search on documents.",
    "metadata": { "source": "embeddings-guide", "difficulty": "intermediate" }
  },
  {
    "id": "doc-3",
    "text": "Vector databases like Pinecone optimize storage and retrieval of embeddings at scale. They use advanced indexing techniques like HNSW.",
    "metadata": { "source": "vector-db", "difficulty": "intermediate" }
  }
]
EOF

# Run upsert
npx ts-node src/commands/upsert.ts sample-docs.json
```

**Expected Output:**

```
Loading documents from sample-docs.json...
Loaded 3 documents

🚀 Upsert Pipeline Started
   Documents: 3
   Batch size: 100
   Rate limit: 100ms between embeddings

📝 Embedding 3 documents...
   [3/3] Cost so far: $0.000001
   ✓ Embedded 3/3
   Estimated cost: $0.000001

⬆️  Upserting 3 vectors...
   [3/3] Upserted: 3
   ✓ Completed: 3 upserted, 0 failed

✅ Upsert Complete
   Time: 1.5s
   Documents loaded: 3
   Vectors upserted: 3
   Failed: 0
   Embedding cost: $0.000001
   Storage cost/month: $0.000001
```

### Test 2: Verify vectors in Pinecone

```typescript
import { getPineconeIndexClient } from "./src/services/index-client";

async function verify(): Promise<void>;
```

### Test 3: Error scenarios

```bash
# Test with invalid documents
cat > invalid-docs.json << 'EOF'
[
  { \"text\": \"Missing id field\" },
  { \"id\": \"doc-2\", \"text\": \"Valid\" }
]
EOF

npx ts-node src/commands/upsert.ts invalid-docs.json
# Expected: Error \"Document at index 0 missing required 'id'\"

# Test with empty documents
cat > empty-docs.json << 'EOF'
[]
EOF

npx ts-node src/commands/upsert.ts empty-docs.json
# Expected: Error \"No documents to upsert\"
```

**Success criteria:**

- ✅ Documents loaded correctly
- ✅ All documents embedded (3 embeddings created)
- ✅ All vectors upserted to Pinecone
- ✅ Metrics reported accurately
- ✅ Pinecone stats show total_vectors increased
- ✅ Metadata preserved in vectors
- ✅ Errors handled gracefully

---

## Data Pipeline Fundamentals

### ETL: Extract, Transform, Load

```
Extract: Load documents from source
  ↓ Get raw documents
  Format: JSON, CSV, API, database

Transform: Prepare documents for embedding
  ↓ Validate structure
  ↓ Clean text (remove special chars)
  ↓ Split into chunks
  ↓ Add metadata

Load: Embed and upsert
  ↓ Create embeddings
  ↓ Batch upsert to Pinecone
  ↓ Verify success

Result: Documents → Vectors → Database
```

### Batch Processing Why

```
Processing 1000 documents:

One-at-a-time (slow):
  Load doc 1 → Embed 1 → Upsert 1 → Load doc 2 → ...
  Time: 1000 embeds × 100ms = 100 seconds

Batched (fast):
  Load all 1000 → Embed in parallel (10 at a time) → Batch upsert
  Time: 100 batches × 100ms = 10 seconds
  → 10x faster!

Benefit: Batch upsert is optimized for multiple vectors at once
```

---

## Cost Analysis

### Per-Document Costs

```
Embedding (OpenAI):
  ~100 chars = 25 tokens
  Cost: 25 * ($0.02 / 1M) = $0.0000005

Storage (Pinecone):
  1 vector = ~8KB
  1000 vectors = ~8MB
  Cost: $0.025 per 1K vectors per month

Total for 1000 documents:
  Embedding: 1000 × $0.0000005 = $0.0005
  Storage: $0.025
  → ~$0.03 per 1000 documents
```

### Scale Examples

```
100 documents:
  Embedding: $0.00005
  Storage: $0.0025
  Total: ~$0.003

10,000 documents:
  Embedding: $0.005
  Storage: $0.25
  Total: ~$0.26 upfront (very cheap)

100,000 documents (1M tokens):
  Embedding: $0.05 (at free tier rates)
  Storage: $2.50/month
  Total: ~$2.55 upfront
```

---

## Common Patterns

### Pattern 1: Incremental upsert (don't re-embed everything)

```typescript
export async function incrementalUpsert(
  newDocuments: Document[],
  alreadyUpsetIds: Set<string>,
): Promise<UpsertMetrics>;
```

### Pattern 2: Upsert with checkpoints (resume from failures)

```typescript
export async function upsertWithCheckpoints(
  documents: Document[],
  checkpointFile: string,
): Promise<UpsertMetrics>;
```

---

## Error Handling Reference

| Error                      | Cause             | Solution                |
| -------------------------- | ----------------- | ----------------------- |
| \"Document missing id\"    | Bad input         | Validate JSON structure |
| \"No documents to upsert\" | Empty input       | Provide documents       |
| \"429 Too Many Requests\"  | Rate limited      | Increase rateLimitMs    |
| \"Invalid API key\"        | Auth failed       | Check OPENAI_API_KEY    |
| \"Index not found\"        | No Pinecone index | Create index first      |
| \"Upsert batch failed\"    | Pinecone error    | Check quota, retry      |

---

## Performance Optimization

### Embeddings Throughput

```
Baseline: 100ms per embedding

Optimizations:
- Decrease rateLimitMs (but watch rate limits)
- Parallel embedding batches
- Shorter documents → faster embedding

Max safe rate:
- Free tier: 20 requests/min (3s between)
- Paid tier: Higher (check your tier)
```

### Upsert Throughput

```
Batch size effects:
- Small (10): More network calls
- Medium (100): Optimal
- Large (1000): Better throughput, more memory

Recommendation: Batch size = 100
```

---

## Constraints

- Text documents only (no images)
- Max document size: 100K characters (can chunk)
- Metadata: 40KB per vector
- Metadata fields must be: string, number, boolean, list

---

## Troubleshooting

### \"Document missing id\"

```
❌ Problem:
  Error: Document at index 0 missing required 'id'

✅ Solution:
  1. Check input JSON has 'id' field for each document
  2. Format: { \"id\": \"string\", \"text\": \"string\" }
  3. All documents need id and text
```

### \"429 Too Many Requests\"

```
❌ Problem:
  Error: Rate limited by OpenAI

✅ Solution:
  Option 1: Increase rateLimitMs (default 100ms → 200ms)
  Option 2: Upgrade OpenAI plan
  Option 3: Batch smaller documents

  Code:
  await upsertDocuments(docs, { rateLimitMs: 500 })
```

### \"Index not found\"

```
❌ Problem:
  Error: Index \"rag-documents\" not found

✅ Solution:
  1. Create index first: await getOrCreatePineconeIndex()
  2. Check PINECONE_INDEX_NAME env var
  3. Verify in Pinecone console
```

---

## Next Steps

**After this task:**

1. Task 04: Query the index to find similar documents
2. Task 05: Use queries in RAG pipeline
3. Task 06: Optimize chunking for better retrieval

**To deepen understanding:**

- Experiment with different batch sizes
- Monitor costs for various document sizes
- Try incremental upsertion pattern
- Implement checkpoint system for large datasets

---

## Tutorial Trigger

- **system_architecture.md** → Fill \"Data Pipeline\" section with upsert patterns

Tutorial focus:

- What = ETL pipeline: transforming documents to vectors
- Why = Need robust, scalable way to populate vector database
- How = Batch processing, error handling, cost tracking
- Gotchas = Rate limits, metadata size, duplicate handling
- Trade-offs = Speed vs cost, batch size vs memory, incremental vs full refresh
