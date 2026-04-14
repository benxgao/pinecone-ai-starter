---
notes: Training tutorial - focus on evaluation methodology and metrics
---

# Tutorial 07 — Evaluating Retrieval Quality

## What You'll Learn

In this tutorial, you'll understand:

- **Why evaluation matters** — Moving beyond guessing to measurement
- **Evaluation metrics** — Precision, Recall, MRR, NDCG explained
- **Creating ground truth** — Building reliable test datasets
- **Test case design** — What makes a good evaluation query
- **Quality thresholds** — What scores mean in practice
- **Failure analysis** — Why retrieval fails and how to diagnose
- **Data-driven optimization** — Using metrics to guide improvements
- **Production monitoring** — Tracking quality over time
- **Comparing strategies** — A/B testing for system improvements

---

## The Core Problem: How Do You Know If Retrieval Works?

### The Naive Approach

Get a few documents back from a search, glance at them, and think:

- "These look relevant" or "These look bad"
- No systematic method
- Subjective and unreliable
- Can't compare two strategies objectively

### The Better Approach: Systematic Evaluation

Define:

1. **Ground truth** — What results _should_ you retrieve?
2. **Metrics** — How to score your results objectively
3. **Test cases** — Representative queries to evaluate
4. **Thresholds** — What score is acceptable?

Now you can measure, compare, and improve systematically.

---

## Ground Truth: The Foundation

### What is Ground Truth?

For each test query, you manually identify which documents _should_ be retrieved.

**Example:**

```
Query: "What is machine learning?"
Ground Truth (relevant documents):
- Document A: "ML is teaching computers to learn"
- Document B: "Neural networks for AI"
Ground Truth (irrelevant documents):
- Document C: "How to teach children"
- Document D: "History of manufacturing"
```

### Creating Ground Truth

**Step 1: Select Test Queries (5-15 queries)**

- Represent different question types
- Cover different topics
- Include edge cases
- Mix simple and complex

**Step 2: Manual Labeling**

- For each query, identify relevant documents
- Try to be consistent
- Use clear criteria (e.g., "relevant if document directly answers question")

**Step 3: Consensus (if multiple people)**

- Have multiple people label
- Discuss disagreements
- Reach consensus
- Document your criteria

### Relevance Definitions

**Binary Relevance (Simple)**

- Relevant = 1 (this document answers the question)
- Not relevant = 0 (this document doesn't answer)

**Graded Relevance (More Nuanced)**

- Highly relevant = 3 (directly answers the question)
- Somewhat relevant = 2 (partially helpful)
- Barely relevant = 1 (tangentially related)
- Not relevant = 0 (completely irrelevant)

Binary is simpler; graded is more realistic.

---

## Key Evaluation Metrics

### Metric 1: Precision at K (Precision@K)

**Question:** Of the K results retrieved, how many were relevant?

**Formula:** `Precision@K = (Number of relevant in top-K) / K`

**Example:**

```
Query: "Machine learning"
Retrieved: [Doc A (relevant), Doc B (irrelevant), Doc C (relevant)]
Precision@3 = 2/3 = 0.67 (67%)

Interpretation: 2 out of 3 results were relevant
```

**Why it matters:** Tells you about false positive rate. Users scroll through all K results—how many waste their time?

**Trade-off:**

- High precision = fewer bad results, better user experience
- Low precision = lots of noise, frustrating

**Target:** Precision@3 > 70% is good for most applications

---

### Metric 2: Recall at K (Recall@K)

**Question:** Of all relevant documents, how many did you find in top-K?

**Formula:** `Recall@K = (Number of relevant in top-K) / (Total relevant documents)`

**Example:**

```
Ground truth has 5 relevant documents for a query.
Retrieved top-K found: 3 of them
Recall@5 = 3/5 = 0.6 (60%)

Interpretation: You found 60% of relevant documents
```

**Why it matters:** Tells you about false negative rate. Are you missing important information?

**Trade-off:**

- High recall = find most relevant documents, comprehensive
- Low recall = miss important results, incomplete answers

**Target:** Recall@5 > 80% is good for most applications

---

### Metric 3: Mean Reciprocal Rank (MRR)

**Question:** How quickly do you find the first relevant result?

**Formula:** For each query, rank of first relevant result = position. MRR = average of 1/rank across queries.

**Example:**

```
Query 1: First relevant at position 1 → 1/1 = 1.0
Query 2: First relevant at position 3 → 1/3 = 0.33
Query 3: First relevant at position 2 → 1/2 = 0.5
MRR = (1.0 + 0.33 + 0.5) / 3 = 0.61

Interpretation: On average, first relevant result at position ~1.6
```

**Why it matters:** Users usually try first few results. Getting the right answer quickly matters psychologically.

**Target:** MRR > 0.5 (first relevant result usually in top 2-3)

---

### Metric 4: Normalized Discounted Cumulative Gain (NDCG)

**Concept:** Ranks matter more when they're higher. A perfect result at position 1 is much better than at position 10.

**How it works:**

- Relevant documents get higher scores if ranked higher
- Results at position 1-3 matter most
- Results at position 10+ matter less
- Compare to perfect ranking (ideal scenario)

**Why it matters:** Real ranking systems aren't just binary (relevant/not). The order matters. NDCG captures this.

**Target:** NDCG > 0.6 indicates good ranking quality

---

## Interpreting Metrics Together

### Understanding the Full Picture

Don't rely on one metric alone:

| Scenario       | Precision | Recall                                       | Implication                                                     |
| -------------- | --------- | -------------------------------------------- | --------------------------------------------------------------- |
| High P, High R | ✓ ✓       | Great!                                       | System is working well                                          |
| High P, Low R  | ✓ ✗       | Retrieving good items, but missing some      | Might need more results (higher K) or better retrieval strategy |
| Low P, High R  | ✗ ✓       | Retrieving all items, but with lots of noise | Need to filter better or rerank results                         |
| Low P, Low R   | ✗ ✗       | Poor                                         | Major issues, needs rethinking                                  |

---

## Failure Analysis: Diagnosing Problems

### If Precision@3 is Low

**Symptom:** Getting lots of irrelevant results

**Possible causes:**

- Embedding model not good for this domain
- Chunking strategy creating bad chunks
- Documents not well prepared
- Query expansion adding noise (if using it)

**Solutions:**

- Check embeddings manually (are semantically similar texts getting similar scores?)
- Review retrieved document samples
- Try different chunk sizes
- Improve document metadata

### If Recall@5 is Low

**Symptom:** Missing relevant documents

**Possible causes:**

- topK too small
- Chunking too aggressive (relevant content split across unrelated chunks)
- Embedding model not capturing domain-specific concepts
- Metadata/structure of documents is confusing

**Solutions:**

- Increase topK (retrieves more results)
- Adjust chunk size
- Add domain-specific training to embeddings (if possible)
- Improve document preparation

### If MRR is Low

**Symptom:** First relevant result is usually buried deep in results

**Possible causes:**

- Ranking not order-aware
- Popular but irrelevant content ranked higher
- Query-document terminology mismatch

**Solutions:**

- Use reranking (more powerful scoring for top results)
- Better preprocessing
- Query expansion to handle terminology differences

---

## Creating a Test Suite

### Minimum Viable Test (5 queries)

Create just enough to verify basic functionality:

- 5 diverse test queries
- Ground truth labels (manual, 5-10 minutes each)
- Compute 4 metrics
- Compare across strategies

### Comprehensive Test (15+ queries)

For production systems:

- 15-25 representative queries
- Cover different topics, question types
- Graded relevance (more nuanced)
- Track metrics over time
- Re-evaluate after changes

### Continuous Evaluation

After deploying:

1. Collect real user queries
2. Manually label samples monthly
3. Track metrics over time
4. Alert if metrics drop
5. Use as feedback for improvements

---

## Practical Workflow

### Phase 1: Baseline

1. Create initial ground truth (10 queries)
2. Evaluate current system
3. Document baseline metrics

### Phase 2: Experimentation

1. Change one thing (e.g., chunk size)
2. Re-evaluate with same ground truth
3. Compare metrics
4. Keep if improved, revert if worse

### Phase 3: Optimization

1. Iterate on multiple strategies
2. Track which changes help most
3. Combine best improvements
4. Validate on new test cases
