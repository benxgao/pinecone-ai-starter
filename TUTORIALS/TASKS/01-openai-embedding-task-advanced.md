---
notes: Training tutorial - remove implementation details and focus on concepts
---

# Tutorial 01 — Understanding Embeddings

## What You'll Learn

In this tutorial, you'll discover:

- **What embeddings are** — How text becomes numbers that computers can understand
- **Why embeddings are powerful** — The difference between keyword search and semantic understanding
- **How embeddings capture meaning** — What makes two texts similar
- **Real-world applications** — How embeddings enable search, recommendation, and AI systems
- **Trade-offs in embedding models** — Speed, accuracy, and cost considerations
- **Practical use in AI systems** — Where embeddings fit in the bigger picture

---

## The Core Concept: From Words to Numbers

### What is an Embedding?

An embedding is a numerical representation of text. Instead of storing "Hello world", we store a list of numbers (typically 300-1536 numbers for modern models) that captures the meaning of that text.

These numbers form a vector—think of it as a point in multi-dimensional space. Text with similar meaning will have vectors that point in similar directions.

### Why This Matters

Our brains understand meaning through language patterns and context. Computers don't "understand" language—they do math. Embeddings are the bridge: they translate human language into mathematical patterns that computers can compare, rank, and reason about.

---

## The Problem: Why Keyword Search Isn't Enough

### A Real Example: Keyword Search Fails

Imagine you're searching for documents about machine learning:

- **Your query:** "machine learning"
- **Document A:** "ML is teaching computers to learn from data"
- **Document B:** "The teaching profession requires patience and dedication"

A simple keyword search sees the word "teaching" in both and treats them as equally relevant. But obviously, Document A is about the right topic while Document B is completely irrelevant.

**The problem:** Keywords don't capture meaning.

### The Solution: Semantic Understanding

With embeddings, the system understands the actual meaning:

- Your query about machine learning becomes a specific numerical pattern
- Document A's description gets a similar numerical pattern (they're about the same topic)
- Document B's text gets a completely different numerical pattern (different topic)

The system can now rank them correctly by comparing their numerical patterns, not just counting matching words.

---

## How Embeddings Work Conceptually

### Step 1: Choose an Embedding Model

Modern embedding models are neural networks trained on massive amounts of text. They've learned to capture semantic relationships through their training process.

For semantic search and retrieval systems, you need embeddings that:

- Capture semantic meaning well
- Have consistent quality
- Are reasonably fast and affordable
- Work across different types of text

### Step 2: Understanding Embedding Dimensions

What do the numbers in an embedding represent? Each number (or "dimension") captures some aspect of meaning:

- Some dimensions might capture topic (is this about technology? sports? cooking?)
- Some capture sentiment (is this positive or negative?)
- Some capture complexity (is this simple or advanced?)
- Some capture linguistic patterns

With 1536 dimensions, the model has many "perspectives" on the meaning of the text.

### Step 3: Comparing Embeddings

To find similar documents, you compare their embeddings mathematically. The closer the vectors point in the same direction, the more similar the meanings.

This is measured as "similarity" on a scale from -1 to +1 (where +1 means identical direction, 0 means perpendicular, -1 means opposite).

---

## Why Embeddings Power Modern AI

### Use Case 1: Semantic Search

Instead of matching keywords, find documents with similar meaning. This is how modern search engines work.

### Use Case 2: Recommendation Systems

Find similar products, articles, or users based on semantic understanding. Netflix uses this to recommend shows.

### Use Case 3: Question-Answering Systems

Find the most relevant information to answer a user's question, by comparing the meaning of the question to available documents.

### Use Case 4: Clustering & Organization

Group similar texts together automatically, based on their numerical representations.

---

## Practical Considerations

### Cost and Performance Trade-offs

Different embedding models have different characteristics:

- **Smaller models:** Faster, cheaper, less accurate
- **Larger models:** Slower, more expensive, more accurate
- **Specialized models:** Better for specific domains

You must choose based on your needs. For many applications, a good balance between cost and quality is ideal.

### Quality Concerns

The quality of your embeddings depends on:

- The base model's training
- Whether it's appropriate for your domain
- How you use it in your application

### When to Use Embeddings

Embeddings are powerful for finding related content, but they're just one tool. For some tasks (like exact matching), simple keyword search might be better. The key is understanding what problem you're solving.

---

## Key Takeaways

**Simple definition:** Embeddings are lists of numbers that represent text meaning.

**Core properties:**

- Same text → Same embedding
- Similar texts → Similar embeddings
- Different texts → Different embeddings

**Why 1536 dimensions?** OpenAI chose this as the sweet spot—enough detail to capture nuanced meaning, but not so many as to be computationally expensive.

**The path forward:**

1. Create embeddings from your documents using OpenAI API
2. Store vectors in a vector database (Pinecone)
3. For user queries, create embeddings and search for similar vectors
4. Use similarity scores to rank relevance

Consider implementing these functions in your project:

```typescript
// Core embedding operations
function createEmbedding(text: string): Promise<number[]>;
function compareEmbeddings(embedding1: number[], embedding2: number[]): number;
function estimateTokens(text: string): number;
```

---

## Cost Analysis

### Pricing

**OpenAI text-embedding-3-small:** $0.02 per 1 million input tokens

**For comparison:**

- GPT-3.5-turbo: $0.50 per 1M tokens (25x more expensive)
- text-embedding-3-large: $0.08 per 1M tokens (4x more expensive)

**Recommendation:** Use `text-embedding-3-small` for most RAG applications unless you need specialized quality.

### Token Counting

A useful rule of thumb: **4 characters ≈ 1 token**

Examples:

- "hello" (5 chars) ≈ 2 tokens
- "machine learning" (15 chars) ≈ 4 tokens
- "The quick brown fox..." (50 chars) ≈ 13 tokens

```typescript
// Estimate tokens from text length
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

For accurate counts, use OpenAI's tokenizer library. But this 4x rule is good enough for cost estimation.

### Cost Examples

Using OpenAI text-embedding-3-small at $0.02 per 1 million tokens:

- 100 chars (≈25 tokens) → ~$0.0000005 (negligible)
- 1,000 chars (≈250 tokens) → ~$0.000005 (still negligible)
- 10,000 chars (≈2,500 tokens) → ~$0.00005 (very cheap)

**Key takeaway:** Embeddings are 25x cheaper than LLM calls. For RAG systems, embedding cost is rarely a bottleneck.

## Next Steps

**After this tutorial:**

1. Move to Task 02 to learn about vector databases
2. Task 03 will combine embedding + storage in practice
3. Task 04 will use embeddings for semantic search

**To deepen your understanding:**

- Read [OpenAI embedding docs](https://platform.openai.com/docs/guides/embeddings)
- Experiment: Create embeddings for similar and dissimilar texts, observe the similarity scores
- Compare: Try text-embedding-3-large to see quality differences
