---
notes: Training tutorial - focus on semantic search concepts
---

# Tutorial 04 — Semantic Search and Similarity

## What You'll Learn

In this tutorial, you'll understand:

- **How semantic search works** — The mechanics of finding similar content
- **Similarity scoring and interpretation** — What do scores really mean?
- **Retrieval pipeline** — The flow from question to results
- **Parameter tuning** — How to control search behavior
- **Filtering and ranking** — Strategies to improve results
- **Real-world search patterns** — How modern systems work
- **Common pitfalls** — Why searches sometimes fail

---

## The Core Concept: Semantic Similarity

### What is Semantic Similarity?

Semantic similarity measures how alike two pieces of text are in meaning, not in spelling or format.

**Example:**

- "machine learning" and "ML" are similar (different words, same meaning)
- "machine learning" and "cars" are dissimilar (different meanings)
- "neural networks" and "machine learning" are somewhat similar (related topics)

The similarity is expressed as a score from 0 to 1 (sometimes -1 to 1, depending on the metric):

- 0 (or -1) = completely different meanings
- 0.5 = moderately related
- 1 = identical or near-identical meaning

### How Similarity is Measured

Both your query and your documents are converted to embeddings (vectors). The computer then measures the angle between these vectors:

**Cosine Similarity**

- Treats vectors as directions in space
- Measures the angle between them
- Perfect match = angle of 0° = cosine value of 1
- Perfect opposite = angle of 180° = cosine value of -1
- Perpendicular = angle of 90° = cosine value of 0

This is simple, fast, and works well for semantic search.

---

## The Retrieval Pipeline

### Step 1: Understanding the Query

Your query "What is machine learning?" goes through these steps:

1. **Embedding** — Convert query to a vector using the same model used for documents
2. **Search** — Use that vector to find similar document vectors
3. **Ranking** — Sort results by similarity score
4. **Filtering** — Apply any quality thresholds or filters
5. **Formatting** — Prepare results for display

### Step 2: The Critical Embedding Model Consistency

Important: Your query and your documents must be embedded using the same model.

Why? Different models have completely different vector representations. If you embedded documents with Model A but query with Model B, the similarity scores will be meaningless.

### Step 3: From Similarity Scores to Results

The database returns vectors with scores. Your system must:

1. Look up the original document metadata
2. Include the similarity score
3. Sort by score (highest first)
4. Present in a readable format

---

## Interpreting Similarity Scores

### What Different Scores Mean

| Score Range | Interpretation         | Example                                          |
| ----------- | ---------------------- | ------------------------------------------------ |
| 0.9 - 1.0   | Near identical meaning | "machine learning" vs "ML" or from same document |
| 0.7 - 0.9   | Very similar           | "machine learning" vs "neural networks"          |
| 0.5 - 0.7   | Related but distinct   | "machine learning" vs "database optimization"    |
| 0.3 - 0.5   | Barely related         | "machine learning" vs "cooking recipes"          |
| 0.0 - 0.3   | Very different         | Random phrases, completely unrelated             |

### The Challenge: What Score is "Good Enough"?

This depends on your application:

**Conservative approach** — Only show results with score > 0.8

- Pro: Very high quality, fewer false positives
- Con: Might miss relevant documents

**Balanced approach** — Show results with score > 0.5

- Pro: Good coverage, reasonable quality
- Con: Some less-relevant items mixed in

**Liberal approach** — Show results with score > 0.3

- Pro: Maximum coverage, finds remotely related documents
- Con: Many false positives, confuses users

Choose based on your user's expectations and tolerance for imprecision.

---

## The topK Parameter: How Many Results to Return

### What is topK?

The number of most-similar documents to return. Common values: 3, 5, 10.

### Trade-offs

**topK = 1**

- Return only the single best result
- Pro: Minimum cost and retrieval latency
- Con: High risk (if that one is wrong, you lose)
- Use: Only when you're very confident in your index quality

**topK = 3-5** (Recommended sweet spot)

- Return 3-5 best results
- Pro: Good balance of cost, speed, and quality
- Con: None, really—this is optimal for most cases
- Use: Default for most applications

**topK = 10+**

- Return many results
- Pro: High coverage, multiple perspectives
- Con: More network cost, more data to process, more noise
- Use: When retrieving for analysis or when context windows are large

### The Practical Algorithm

The system doesn't find top-K by checking all vectors. The vector database efficiently finds approximate top-K through its indexing structure (like HNSW from Tutorial 02). This is why it's fast even with millions of vectors.

---

## Filtering and Refinement Strategies

### Strategy 1: Score Thresholds

After retrieval, filter out results below a quality threshold:

```
Retrieved 10 results with scores:
0.92, 0.88, 0.85, 0.62, 0.58, 0.51, 0.48, 0.35, 0.28, 0.15

With threshold 0.65:
Keep: 0.92, 0.88, 0.85
Discard: everything else
Result: Only high-quality items shown
```

### Strategy 2: Diversity Filtering

Sometimes you get multiple very similar results from the same document or source. Diversity filtering reduces redundancy:

**Before:** Find 5 most similar results
**After:** Find 5 most similar results, then filter out near-duplicates same source

Result: More varied, useful perspectives in the search results.

### Strategy 3: Recency Bias

For time-sensitive information:

- Prefer recent documents when scores are similar
- Only works if you have date metadata
- Useful for news, research, documentation

### Strategy 4: Domain-Specific Ranking

Combine similarity score with domain knowledge:

- Factor in document authority or "trustworthiness"
- Weight results based on source reliability
- Combine multiple signals into a final score

---

## Common Retrieval Challenges

### Challenge 1: Over-general Queries

Query: "What is this?"

Problem: Too vague to find specific information. System retrieves loosely related documents with moderate scores.

Solution: Encourage more specific queries. In your UI/API docs, guide users to be more specific.

### Challenge 2: Query-Document Mismatch

Query uses different terminology than documents.

Example:

- Query: "self-driving cars"
- Documents: "autonomous vehicles"
- Same topic, different words → low similarity score

Solution: Query expansion (covered in Tutorial 08).

### Challenge 3: Irrelevant Matches

Query retrieves documents that are incidentally similar but not truly relevant.

Example:

- Query: "machine learning"
- Retrieved: Document on "teaching machines" (false match on "machines")

Solution: This actually works better than keyword search! The semantic similarity is still usually correct. Document embeddings trained on good data generally avoid this.

---

## Implementation Guide

Core functions to implement for semantic search:

```typescript
// Core data types
interface RetrievalResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

// Main search function
async function querySimilar(
  query: string,
  topK?: number,
): Promise<RetrievalResult[]>;

// Utility functions
function getSimilarityLabel(score: number): string;
function formatResults(results: RetrievalResult[]): string;
async function querySimilarFiltered(
  query: string,
  topK?: number,
  minScore?: number,
): Promise<RetrievalResult[]>;
```

**Implementation steps:**

1. **Embed the query** - Convert user query to vector using same model as documents
2. **Search Pinecone** - Find nearest neighbors using topK parameter
3. **Transform results** - Extract text, score, and metadata for display
4. **Format output** - Present results in readable format with similarity labels

**API endpoint pattern:**

```typescript
// POST /api/search
// Request: { "query": "What is machine learning?", "topK": 3 }
// Response:
// {
//   "query": "...",
//   "topK": 3,
//   "results": [
//     { "id": "doc-1", "text": "...", "score": 0.92 },
//     ...
//   ]
// }

router.post("/", async (req: Request, res: Response): Promise<void>
```

**Key steps:**

- Validate query input
- Call `querySimilar()` with topK parameter
- Return formatted results with similarity scores

### Testing Your Implementation

Test these queries to verify semantic understanding works:

1. **Semantic similarity** - Query: "AI learns from examples" → Should find "machine learning" docs
2. **Related concepts** - Query: "embeddings and vectors" → Should retrieve relevant content
3. **Unrelated queries** - Query: "cooking recipes" → All scores should be <0.5

**Success criteria:**

# }

````

### Test 2: Various queries to understand semantics

```bash
# Semantic similarity (not keyword matching)
curl -X POST http://localhost:5000/api/search \
  -d '{"query": "AI learns from examples", "topK": 3}'
# Should find doc-1 even though wording is different

# Related concept
curl -X POST http://localhost:5000/api/search \
  -d '{"query": "embeddings and vectors", "topK": 3}'
# Should prioritize doc-3

# Unrelated query
curl -X POST http://localhost:5000/api/search \
  -d '{"query": "cooking recipes", "topK": 3}'
# All scores should be <0.5
````

### Success Criteria

- Results returned with scores in 0.0-1.0 range
- Results sorted by score (highest first)
- Response time <1 second
- Semantically similar content ranks higher

---

## Cosine Similarity: How It Works

**Simple explanation:** Cosine similarity measures the angle between two vectors.

- 1.0 = identical direction (perfect match)
- 0.5 = moderate similarity (somewhat related)
- 0.0 = perpendicular (no relation)

**Why use cosine?** For text embeddings, direction matters more than magnitude. Two documents with the same meaning have vectors pointing in the same direction, even if they differ in length or scale.

**Example:**

```
Query: "machine learning" → [0.1, -0.2, 0.3, ...]
Doc A: "ML is teaching computers" → [0.09, -0.21, 0.31, ...] = 0.95 similarity ✅
Doc B: "cooking recipes" → [-0.4, 0.8, -0.2, ...] = 0.12 similarity ❌
```

---

## topK Parameter: How Many Results to Return

**What it means:**

- topK=1 → Return only the 1 best match
- topK=3 → Return top 3 (recommended default)
- topK=10 → Return top 10

**Guidance by use case:**

| Use case     | topK | Reason                      |
| ------------ | ---- | --------------------------- |
| Quick answer | 1-2  | Speed and high confidence   |
| Q&A system   | 3-5  | Balance context + precision |
| Analysis     | 5-10 | Multiple perspectives       |

**How to choose:**

1. Start with topK=3 (industry standard)
2. If lack context → increase to 5
3. If results seem noisy → decrease to 2
4. Use evaluation metrics (Tutorial 07) to measure impact

---

## Using Similarity Scores

**Score interpretation:**

| Score     | Meaning                    | Example                                        |
| --------- | -------------------------- | ---------------------------------------------- |
| 0.95-1.0  | Perfect/near-perfect match | Query & result share identical concepts        |
| 0.85-0.95 | Excellent match            | Query asks about ML, result explains it        |
| 0.70-0.85 | Good match                 | Query "AI techniques", result covers ML subset |
| 0.50-0.70 | Related but not strongly   | Query "learning", result "statistical methods" |

                 → Relevant but not exact, usually useful

Score 0.60-0.70 "Fair match"
Query: "neural networks"
Result: "Machine learning basics"
→ Related but not precisely matching
→ Include with caution

Score <0.60 "Weak/Poor match"
Query: "cooking recipes"
Result: "Machine learning"
→ Usually not relevant, filter out

````

### Using scores in practice

**Quality filtering techniques:**

```typescript
// Strict quality: keep only top-tier results (>0.85)
const highQuality = results.filter((r) => r.score > 0.85);

// Confidence classification based on top result
if (topScore > 0.9) confidence = "high";
else if (topScore > 0.75) confidence = "medium";
else confidence = "low";

// Relevance threshold: discard below minimum
const relevant = results.filter((r) => r.score > minScore);
````

This pattern is used in all three search strategies (confidence, threshold filtering, diversity).

---

## Common Patterns

### Pattern 1: Score-based confidence

```typescript
export async function searchWithConfidence(
  query: string,
  topK?: number,
): Promise<{ confidence: string; results: RetrievalResult[] }>;
```

**Logic:** Map top result's score to confidence level (low/medium/high)

### Pattern 2: Threshold filtering

```typescript
export async function searchMinimumQuality(
  query: string,
  minScore?: number,
  maxResults?: number,
): Promise<RetrievalResult[]>;
```

**Logic:** Fetch candidates, filter by minimum score, return top N results

### Pattern 3: Result diversity

```typescript
export async function searchDiverse(
  query: string,
  topK?: number,
): Promise<RetrievalResult[]>;
```

**Logic:** Retrieve 2x candidates, filter duplicates, return diverse top-K results

---

## Troubleshooting

| Problem                  | Cause                      | Solution                                                      |
| ------------------------ | -------------------------- | ------------------------------------------------------------- |
| "No results returned"    | Empty index                | Verify documents are seeded (Task 03)                         |
| "All scores < 0.5"       | Semantic mismatch          | Query doesn't match documents, try different phrasing         |
| "Timeout after 30s"      | Slow Pinecone              | Reduce topK or check network                                  |
| "Dimension mismatch"     | Different embedding model  | Ensure same model (text-embedding-3-small) for query and docs |
| "Inconsistent scores"    | Non-deterministic behavior | Scores should be consistent for same query                    |
| "Expected doc not found" | Wrong document ID format   | Verify doc IDs during seeding match query results             |

---

## Performance Tuning

### Latency optimization

**Key lever:** Reduce `topK` for faster responses

- topK=1: ~100ms (fastest, single result)
- topK=3: ~150ms (standard)
- topK=10: ~200ms (most comprehensive)

Parallel queries don't help since embedding must complete before search begins. Focus on reducing topK for speed-critical paths.

### Cost optimization

**Cost breakdown:**

- Embed query: ~$0.000001 per call
- Pinecone search: Free
- **Total per query:** Negligible (~$0.000001)

The primary cost is embedding, and it's extremely cheap for semantic search workloads.

---

## Constraints

- topK default = 3 (can be customized in API)
- No filtering yet (implement in Task 08)
- No re-ranking (implement in Task 08)
- Single index only (no cross-index search)

---

## Next Steps

**After this task:**

1. Move to Task 05 to see how retrieval fits into RAG
2. Return to Task 04 tuning after Task 07 (evaluation)
3. Implement advanced retrieval in Task 08

---

## Tutorial Trigger

- **vector-search.md** → Fill "How" section with query and similarity search patterns

**Tutorial focus:**

- How = Pinecone query, embedding queries, similarity search mechanics
- Gotchas = cosine similarity interpretation, topK selection, no results scenarios
- Trade-offs = speed vs comprehensiveness, precision vs recall
