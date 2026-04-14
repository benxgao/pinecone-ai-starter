---
notes: Training tutorial - focus on vector database concepts
---

# Tutorial 02 — Vector Databases and Indexing

## What You'll Learn

In this tutorial, you'll understand:

- **What a vector database is** — Why it's different from regular databases
- **How vector indexing works** — Finding similar vectors efficiently
- **Scalability challenges** — Why naive approaches don't work
- **Index metrics and trade-offs** — Different ways to measure similarity
- **Real-world vector database patterns** — Architecture and design choices
- **When to use vector databases** — And when simpler solutions suffice

---

## The Core Problem: Searching in Vector Space

### The Naive Approach: Brute Force Search

When you want to find vectors similar to a query vector, the simplest approach is:

1. Calculate distance/similarity to every stored vector
2. Sort all results by similarity
3. Return the top results

This works fine for small datasets (hundreds or thousands of items), but breaks down at scale:

- With 1 million vectors and 1536 dimensions each, comparing all vectors takes time
- With billions of vectors (real search engines), it becomes prohibitively slow
- Memory requirements grow with dataset size

### Why This Matters

For interactive search, users expect results in milliseconds. Brute force search doesn't scale to real-world dataset sizes. We need smarter algorithms.

---

## The Solution: Hierarchical Indexing

### How HNSW (Hierarchical Navigable Small World) Works

HNSW is an algorithm that builds a multi-layered graph structure over your vectors. Think of it like this:

1. **Layer 0 (Ground layer):** All vectors are connected in a graph
2. **Layer 1:** Fewer vectors, forming a sparser graph
3. **Layer 2:** Even fewer vectors
4. Continue building fewer, sparser layers

When searching:

- Start at the top sparse layer
- Greedily jump toward your query in that layer
- When no closer neighbors exist, go down to the next layer
- Repeat until you reach the dense ground layer

**Result:** You find similar vectors through a few hops instead of checking everything.

### Why This is Clever

- Search time: Instead of $O(n \cdot d)$ (checking all n vectors, each with d dimensions), it's roughly $O(\log n)$ (a few hops through the hierarchy)
- With 1 million vectors: Brute force takes ~100 seconds, HNSW takes ~100 milliseconds
- The trade-off: You store extra graph structure (takes memory), but searching is much faster

---

## Vector Database Concepts

### What Makes a Good Vector Database?

**1. Indexing Speed**
How fast can you add new vectors? This matters when you're continuously updating your dataset.

**2. Query Speed**
How fast can you search? This affects real-time application performance.

**3. Accuracy**
Does the index find the closest vectors reliably? Important for retrieval quality.

**4. Scalability**
Can it handle millions or billions of vectors?

**5. Cost Efficiency**
Storage requirements, compute resources, and operational overhead.

### Similarity Metrics

Different applications need different ways to measure "similarity":

**Cosine Similarity**

- Measures the angle between two vectors
- Range: -1 (opposite direction) to +1 (same direction)
- Good for: Text embeddings, semantic search
- Why: Embeddings are typically normalized, so angle matters more than magnitude

**Euclidean Distance**

- Measures straight-line distance between points
- Smaller = more similar
- Good for: Geographic coordinates, precise numeric similarity
- Why: Useful when magnitude and position both matter

**Dot Product**

- Measures projection overlap
- Only appropriate when vectors are already normalized
- Less commonly used for general similarity

---

## Real-World Vector Database Architecture

### Data Flow

1. **Embedding Creation:** Text → embedding model → vector
2. **Indexing:** Vector + metadata → vector database index
3. **Querying:** Query text → embedding model → search vector → database query → results
4. **Result Retrieval:** Get vectors with similarity scores → look up original documents

### Key Architectural Decisions

**Single vs Distributed**

- Single machine: Good for <10M vectors, simpler operations
- Distributed: Necessary for >10M vectors, higher complexity

**Real-time vs Batch**

- Real-time indexing: Updates available immediately, higher complexity
- Batch indexing: Updates in scheduled batches, simpler operations

**In-Memory vs Persistent**

- In-memory: Fast but limited by RAM
- Persistent on disk: Slower but can store unlimited data

---

## Practical Vector Database Usage

### Cost Considerations

Vector databases have multiple cost factors:

- **Indexed vectors:** Storage for vectors and index structure
- **Queries:** Number of search operations
- **Throughput:** Peak concurrent queries
- **Features:** Replication, availability guarantees

Free tiers typically allow:

- Small number of indexed vectors (100k-1M)
- Limited concurrent usage
- Single node/region

### Common Patterns

**Pattern 1: Singleton Client**

- Maintain one connection to the database
- Reuse it for all operations
- Reduces overhead and connection churn

**Pattern 2: Batch Operations**

- Group multiple insert/update operations
- Send in one request instead of many
- Dramatically improves throughput

**Pattern 3: Metadata Alongside Vectors**

- Store original document information with each vector
- Enables returning meaningful results to users
- Trade-off: Slightly more storage

---

## Key Takeaways

Tutorial focus:

- What = Vector databases: why they exist, how they work
- Why = Semantic search at scale requires indexing
- How = Pinecone setup, index configuration, lifecycle
- Gotchas = Quota limits, dimension mismatches, region selection
- Trade-offs = Cost vs storage, performance vs complexity, free vs paid
