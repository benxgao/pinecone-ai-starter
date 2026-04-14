---
notes: Training tutorial - focus on retrieval optimization techniques
---

# Tutorial 08 — Advanced Retrieval Optimization

## What You'll Learn

In this tutorial, you'll understand:

- **Why basic retrieval needs optimization** — Limitations of simple vector search
- **Query expansion** — Searching with multiple angles
- **Multi-retriever fusion** — Combining different search methods
- **Reranking strategies** — Using smarter scoring for better results
- **Hybrid search** — Combining semantic and keyword search
- **Filtering and ranking** — Advanced result filtering
- **A/B testing frameworks** — Measuring improvement systematically
- **Cost-quality trade-offs** — Speed vs accuracy decisions
- **Optimization loops** — Iterative improvement methodology
- **Production monitoring** — Tracking performance over time

---

## The Core Problem: Basic Retrieval Has Limits

### What's Wrong with Simple Vector Search?

Simple vector search works, but it has blind spots:

**Problem 1: Query Phrasing**

```
Document says: "autonomous vehicles"
User asks: "self-driving cars"
Meaning is similar, but embeddings may not match perfectly
Result: Document not retrieved (or ranked lower than it should be)
```

**Problem 2: Terminology Mismatch**

```
Document uses technical terms: "supervised classification"
User uses everyday language: "how to teach a program"
Different vocabulary, similar concepts
Result: Missed retrieval
```

**Problem 3: Different Document Aspects**

```
User asks: "red cars"
Document contains:
- Section 1: "red" (color discussion)
- Section 2: "cars" (transportation)
But query about cars that are red
Result: False positive (both words present but not together)
```

**Problem 4: Context Limitations**

```
Query: "What year did X happen?"
Document has: "X happened during the Great Depression"
Semantic similarity is high, but doesn't answer the specific question
Result: Retrieved but not useful
```

### The Solution: Advanced Retrieval Techniques

Instead of one search pass, use multiple complementary strategies:

- Search the same query multiple ways
- Search different formulations of the query
- Combine keyword and semantic search
- Rerank results more carefully

---

## Technique 1: Query Expansion

### What is Query Expansion?

Instead of searching for the user's exact question, generate multiple variations and search for all of them.

### How Query Expansion Works

**Original query:** "Machine learning"

**Expanded queries:** (Generate automatically)

- "machine learning"
- "ML"
- "artificial intelligence models"
- "neural networks"
- "AI algorithms"

**Search strategy:**

1. Search for each variant
2. Collect all results
3. Deduplicate (same document mentioned in multiple searches)
4. Rank by frequency (documents found in multiple searches ranked higher)

### Why This Works

Different documents might use different terminology. By searching multiple ways, you cast a wider net. Documents that match multiple variants are probably genuinely relevant.

### Cost-Quality Trade-off

**Cost:** 4-5x the retrieval cost (searching 5 variants instead of 1)

**Quality improvement:** 15-30% better retrieval quality

**Decision:** Usually worth it. Better quality often justifies higher cost.

### Implementation Approaches

**Approach 1: Hard-coded Variations**

- Manually define variations for common queries
- Fast, predictable
- Works for known question types

**Approach 2: LLM-Generated Variations**

- Ask an LLM to generate variations
- Flexible, works for any query
- More expensive, newer approach

**Approach 3: Domain-Specific Expansion**

- Use domain knowledge (medical synonyms, technical glossaries)
- Very accurate for specific domains
- Requires domain expertise

---

## Technique 2: Hybrid Search

### The Idea

Semantic search (vector similarity) and keyword search have different strengths:

| Aspect                 | Semantic Search | Keyword Search |
| ---------------------- | --------------- | -------------- |
| Understands meaning    | ✓               | ✗              |
| Handles synonyms       | ✓               | ✗              |
| Exact match capability | ✗               | ✓              |
| Boolean queries        | ✗               | ✓              |
| Speed                  | Moderate        | Fast           |

Combine both for best of both worlds.

### How Hybrid Search Works

**For a query "machine learning algorithms":**

**Step 1: Semantic Search**

- Embed query: "machine learning algorithms" → vector
- Find similar documents using vector database
- Get results: [Doc A (0.87), Doc B (0.82), Doc C (0.79)]

**Step 2: Keyword Search**

- Search for keywords: "machine" OR "learning" OR "algorithms"
- Get results: [Doc A (match 3 words), Doc C (match 2 words), Doc X (match 1 word)]

**Step 3: Fusion**

- Combine scores from both searches
- Documents appearing in both searches ranked higher
- Weight them (e.g., 60% semantic, 40% keyword, or 50/50)

**Result:** Better coverage than either alone

### When to Use Hybrid

**Use hybrid when:**

- You have important structured data (dates, categories)
- Keyword precision matters (technical documentation)
- You need boolean queries (e.g., "medical term" but NOT "historical")
- Budget allows extra cost

**Skip hybrid when:**

- Data is mostly unstructured prose
- Keyword search worse than semantic (not useful)
- Cost is hard constraint
- Semantic search already works well (>85% quality)

---

## Technique 3: Reranking

### The Problem with Initial Retrieval

Vector databases use fast approximate algorithms (like HNSW from Tutorial 02). These are fast but approximate:

- May not return true top-K
- Works well enough most of the time
- But not optimal

### How Reranking Works

**Two-stage process:**

**Stage 1: Initial Retrieval (Fast)**

- Use vector database HNSW
- Return top-20 results (broader than needed)
- Fast, approximate

**Stage 2: Reranking (Careful)**

- Take top-20 from stage 1
- Score each more carefully using more expensive model
- Sort by new scores
- Return top-3 from reranked results

### Why This Works

**Stage 1 efficiency:** HNSW finds roughly relevant documents quickly

**Stage 2 precision:** Expensive scoring only applied to top-20, not millions

**Result:** More accurate top results than naive approach

### Reranking Models

**Option 1: Semantic Reranker (Cross-Encoder)**

- More sophisticated similarity model
- Scores both query and document comprehensively
- Slightly more expensive than vector search

**Option 2: Domain-Specific Ranker**

- Trained on your specific domain
- Understands your terms and concepts
- Most effective but requires training data

**Option 3: Hybrid Ranker**

- Combines semantic score + keyword match + metadata
- Custom weighting based on your domain
- Most flexible

### Cost-Quality Trade-off

**Cost:** 10-20% additional cost (careful scoring of top-20)

**Quality improvement:** 15-30% better ranking

**Latency:** Minimal increase (still <500ms total for most systems)

**Decision:** Usually worth it. Provides major quality boost for reasonable cost.

---

## Technique 4: Reciprocal Rank Fusion (RRF)

### The Problem It Solves

When combining results from multiple retrievers (semantic + keyword, or multiple query variants), how do you fairly combine them?

Different retrievers have different score scales:

- Semantic similarity: 0.0-1.0
- Keyword matching: counts or percentages
- Different databases: different scoring

Simply averaging doesn't work well.

### How RRF Works

Instead of averaging scores, use ranks:

```
Semantic Search Results:
1. Doc A (score 0.95)
2. Doc B (score 0.88)
3. Doc C (score 0.82)

Keyword Search Results:
1. Doc C (score high)
2. Doc A (score medium)
4. Doc X (score low)

RRF Calculation:
Doc A: 1/(1+1) + 1/(2+1) = 1.0 + 0.33 = 1.33
Doc B: 1/(2+1) = 0.33
Doc C: 1/(3+1) + 1/(1+1) = 0.25 + 0.5 = 0.75
Doc X: 1/(4+1) = 0.2

Final Ranking: A > B > C > X
```

### Why RRF is Clever

- Fair comparison (both retrievers have equal opportunity)
- Normalized scale (0 to 2 for two retrievers)
- Robust to score variation
- Simple to understand and implement

### When to Use RRF

Perfect when combining:

- Semantic + keyword search
- Multiple query variants
- Different embedding models
- Different retrieval strategies

---

## The Optimization Loop

### Systematic Improvement Process

**Step 1: Measure Baseline**

- Create evaluation test cases
- Run simple vector search
- Record metrics (Precision, Recall, NDCG)

**Step 2: Hypothesis**

- Analyze failures: What's going wrong?
- Form hypothesis: "Query expansion would help" or "Need reranking"
- Choose one technique to try

**Step 3: Implement**

- Add chosen technique
- Keep everything else identical

**Step 4: Measure**

- Re-run evaluation
- Compare metrics

**Step 5: Decide**

- If improved: Keep it. Proceed to next hypothesis.
- If degraded: Remove it. Try different technique.

**Step 6: Iterate**

- Repeat steps 2-5 with new hypotheses

### Typical Improvement Path

1. **Baseline:** Precision@5 = 0.65
2. **Add query expansion:** Precision@5 = 0.72 (+7%)
3. **Add reranking:** Precision@5 = 0.78 (+6%)
4. **Add hybrid search:** Precision@5 = 0.81 (+3%)
5. **Tune thresholds:** Precision@5 = 0.82 (+1%)

Each step adds 1-7% improvement. Combined effect is significant.

### When to Stop Optimizing

Stop when:

- You reach your quality target
- Cost increase outweighs quality gain
- Diminishing returns (each step adds <2%)
- Time/resources better spent elsewhere

---

## Production Considerations

### Monitoring and Alerting

After optimization, track:

- Retrieval quality metrics (weekly)
- User satisfaction (feedback, explicit ratings)
- System cost (tokens, API calls)
- Latency (response time)

Alert if:

- Metrics drop >5%
- Cost increases >20% unexpectedly
- Latency exceeds acceptable threshold

### A/B Testing

When deploying changes:

1. **Control group:** Gets old system (baseline)
2. **Treatment group:** Gets new system
3. **Measure:** Compare metrics over time
4. **Statistical significance:** Ensure improvement isn't random
5. **Deploy if positive:** Roll out to all users

### Continuous Improvement

- Collect real user queries monthly
- Sample and manually evaluate
- Use as feedback for next optimization round
- Adapt as user needs evolve

---

## Decision Framework

### When to Use Each Technique

| Technique       | Best For                         | Cost     | Complexity | Quality Gain |
| --------------- | -------------------------------- | -------- | ---------- | ------------ |
| Query expansion | Terminology mismatch             | 4-5x     | Low        | 15-30%       |
| Hybrid search   | Structured data, precision needs | 1-2x     | Medium     | 10-20%       |
| Reranking       | Highest quality needed           | 1.1-1.2x | Medium     | 15-30%       |
| RRF             | Combining methods                | Minimal  | Low        | Varies       |

### Building Your Optimization Plan

1. **Start:** Evaluate baseline with 10 test queries
2. **Identify:** Biggest failure modes
3. **Pick:** Technique that addresses them
4. **Implement:** See Technique 1-4
5. **Measure:** Evaluate with same test queries
6. **Decide:** Keep if ≥5% improvement
7. **Repeat:** Next technique
8. **Validate:** Cross-check with new test cases
9. **Deploy:** Monitor in production

---

## Key Takeaways

**Definition:** Generate multiple search queries to capture different phrasings

### Simple Expansion (Template-based)

```ts
// src/services/query-expansion.ts

export async function expandQuery(question: string): Promise<string[]>;
```

**Strategy:**

1. Keep original query
2. Convert question to statement (remove "What", "How", "Why")
3. Apply synonyms (e.g., "ML" → "machine learning")
4. Extract key phrases
5. Return unique set

### LLM-based Expansion (More sophisticated)

```ts
export async function expandQueryWithLLM(
  question: string,
  client: OpenAI,
): Promise<string[]>;
```

**Strategy:**

1. Prompt LLM: "Generate 3 alternative phrasings for this question"
2. Parse JSON response
3. Return original + 3 LLM-generated variants
4. More flexible than templates, works for any query type

---

## Technique 2: Multi-Retriever Fusion

**Definition:** Combine results from multiple search methods

### Reciprocal Rank Fusion

```ts
// src/services/fusion.ts

export interface RetrievalResult {
  id: string;
  text: string;
  score: number; // 0-1 similarity/relevance
}

/**
 * Reciprocal Rank Fusion (RRF)
 * Formula: Score = sum(1 / (k + rank)) where k=60
 * Combines results from multiple retrievers without score normalization
 */
export function reciprocalRankFusion(
  resultGroups: RetrievalResult[][],
): RetrievalResult[];
```

**Algorithm:**

1. For each result group, score by rank: `1 / (k + rank)`
2. Sum scores for documents appearing in multiple groups
3. Sort by total RRF score
4. Return merged results

**Advantage:** Fair comparison across different retrievers and scoring scales

---

## Technique 3: Reranking

**Definition:** Use a more powerful model to rerank initial results

### Semantic Reranking

```ts
// src/services/reranking.ts

import { createEmbedding } from "./embedding";

/**
 * Semantic reranking using cosine similarity
 * Process: Embed question, calculate similarity to each candidate, sort by score
 */
export async function semanticRerank(
  question: string,
  candidates: RetrievalResult[],
  topK?: number,
): Promise<RetrievalResult[]>;
```

### Cross-Encoder Reranking (More Powerful)

```ts
/**
 * Cross-encoder reranking using external API (e.g., Cohere)
 * Uses model trained on question-document pairs
 * Score range: 0-1 (relevance probability)
 */
export async function crossEncoderRerank(
  question: string,
  candidates: RetrievalResult[],
  topK?: number,
): Promise<RetrievalResult[]>;
```

**Process:**

1. Send question + candidate texts to reranking service
2. Receive relevance scores (0-1)
3. Sort by score, return top-K
4. More sophisticated than semantic similarity, better accuracy

---

## Technique 4: Hybrid Search

**Definition:** Combine semantic search with keyword/BM25 search

### Simple Hybrid (Semantic + Keyword)

```ts
// src/services/hybrid-search.ts

export interface HybridSearchOptions {
  semanticWeight: number; // 0-1, default 0.7
  keywordWeight: number; // 0-1, default 0.3
}

/**
 * Hybrid search combines semantic + keyword methods
 * Benefits: Semantic (understanding) + Keyword (precision)
 */
export async function hybridSearch(
  question: string,
  index: PineconeIndex,
  options?: HybridSearchOptions,
): Promise<RetrievalResult[]>;
```

**Process:**

1. **Semantic search:** Vector similarity (top 10)
2. **Keyword search:** Word matching on keywords (score per doc)
3. **Fusion:** Combine scores with configurable weights (default: 70% semantic, 30% keyword)
4. **Return:** Top results ranked by combined score

---

## Complete Optimization Pipeline

### Combining All Techniques

```ts
// src/services/optimized-retrieval.ts

export async function optimizedRetrieve(
  question: string,
  index: PineconeIndex,
  evaluator: RetrieverEvaluator,
): Promise<RetrievalResult[]>;
```

**Complete pipeline:**

1. **Query Expansion:** Generate multiple query variants
2. **Multi-Retriever Search:** Search each variant (5 results each)
3. **Result Fusion:** RRF combine all results
4. **Semantic Reranking:** Re-score top candidates
5. **Evaluation:** Calculate quality metrics (nDCG, MRR)

---

## A/B Testing Framework

### Setup

```ts
// src/services/ab-testing.ts

export interface ABTestResult {
  variant: string; // 'baseline' | 'improved'
  nDCG: number; // Normalized Discounted Cumulative Gain
  MRR: number; // Mean Reciprocal Rank
  latency: number; // Milliseconds
  cost: number; // API call cost estimate
}

export async function runABTest(
  questions: string[],
  index: PineconeIndex,
  evaluator: RetrieverEvaluator,
): Promise<Map<string, ABTestResult[]>>;

export function analyzeResults(results: Map<string, ABTestResult[]>): {
  improvement: number;
  costIncrease: number;
};
```

**A/B Test Process:**

1. For each test question, run baseline (standard retrieval)
2. Run improved (optimized retrieval)
3. Record: nDCG, MRR, latency, cost for each
4. Analyze: Calculate average improvement % and cost increase %

### Running A/B Test

**Decision criteria:**

- Quality improvement > 10% + Cost increase < 20% → **Deploy** ✅
- Quality improvement > 5% + Cost increase < 10% → **Consider** 🟡
- Otherwise → **Iterate more** 🔄

---

## Monitoring & Iteration

### Production Monitoring

```ts
// src/services/retrieval-monitoring.ts

export interface RetrievalMetrics {
  timestamp: Date;
  question: string;
  retrievalTime: number; // Milliseconds
  qualityScore: number; // 0-1
  documentsRetrieved: number;
  answerSatisfactory: boolean; // User feedback
}

/**
 * Log retrieval metrics for monitoring
 */
export async function logRetrievalMetrics(
  metrics: RetrievalMetrics,
): Promise<void>;

/**
 * Get recent performance metrics
 */
export async function getRecentPerformance(hours?: number): Promise<{
  avgQualityScore: number;
  satisfactionRate: number;
  p95Latency: number;
}>;
```

**Monitoring setup:**

- Log every retrieval: timestamp, question, latency, quality, user satisfaction
- Get performance: Aggregate last N hours, calculate p95 latency, satisfaction rate

---

## Common Issues & Solutions

| Issue                      | Symptom              | Solution                                       |
| -------------------------- | -------------------- | ---------------------------------------------- |
| "Query expansion too slow" | Latency > 3s         | Reduce number of variants or use pre-generated |
| "Fusion not helping"       | Same results         | Ensure variants are sufficiently different     |
| "Reranking too expensive"  | Cost up 50%          | Use semantic instead of cross-encoder          |
| "Latency regression"       | Slower than baseline | Reduce topK or number of retrievers            |
| "Quality not improving"    | nDCG flat or down    | Tune weights, check expansion quality          |

---

## Decision Tree

```

Does baseline retrieval work well (nDCG > 0.85)?
├─ YES: Stop here, optimization not needed
└─ NO: Continue...

Is the problem missed documents?
├─ YES: Try query expansion
│ Did quality improve?
│ ├─ YES: Deploy
│ └─ NO: Add fusion + reranking
│
└─ NO: Is the problem low-quality results?
├─ YES: Try reranking
│ Too expensive?
│ ├─ YES: Use semantic ranking
│ └─ NO: Use cross-encoder
│
└─ NO: Try hybrid search
Combination helps?
├─ YES: Deploy with A/B test
└─ NO: Reassess chunking strategy

```

---

## Constraints

- Query expansion can increase latency
- Reranking adds cost (extra API calls or models)
- Fusion requires multiple retrievals
- A/B testing requires baseline metrics

---

## Next Steps

1. **After this task:** You have a complete optimized RAG system
2. **Monitor:** Track quality metrics in production
3. **Iterate:** Use feedback to further improve
4. **Scale:** Deploy confident changes to all users

---

## Success Checklist

- ✅ Query expansion working (generates diverse variants)
- ✅ Fusion improving results (+ 5-10% nDCG)
- ✅ Reranking effective (+ 5-15% nDCG)
- ✅ Latency acceptable (< 2s total)
- ✅ Cost increase justified (< 20%)
- ✅ A/B test showing improvement
- ✅ Production monitoring in place

---

## Tutorial Trigger

- **rag.md** → Add "Advanced Optimization" section

Tutorial focus:

- What = Retrieval optimization techniques
- Why = Better retrieval = better answers = higher user satisfaction
- How = Query expansion, fusion, reranking, hybrid search
- Gotchas = Added latency/cost, diminishing returns, proper A/B testing needed
- Trade-offs = Speed vs quality, cost vs accuracy, complexity vs results
