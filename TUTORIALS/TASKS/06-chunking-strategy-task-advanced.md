---
notes: Training tutorial - focus on chunking concepts and trade-offs
---

# Tutorial 06 — Document Chunking Strategies

## What You'll Learn

In this tutorial, you'll understand:

- **Why chunking matters** — Impact on retrieval quality and cost
- **Chunking fundamentals** — What makes a good chunk
- **Size trade-offs** — Small vs medium vs large chunks
- **Different chunking strategies** — Fixed, sliding, semantic
- **Overlap and boundaries** — Why they matter
- **Metadata preservation** — Keeping context through chunking
- **Cost implications** — How chunking affects expenses
- **Evaluation approaches** — Measuring which strategy works best
- **Real-world patterns** — What works for different document types
- **Optimization techniques** — Fine-tuning for your specific data

---

## The Core Problem: The Chunking Decision

### Why Can't We Just Use Whole Documents?

After all, why not embed entire documents and retrieve them whole?

**Problems with whole documents:**

1. **Size inefficiency** — Embedding a 10,000-word document costs the same as many smaller embeddings
2. **Precision loss** — Retrieving entire document returns lots of irrelevant content mixed with relevant
3. **Context bloat** — Forces your RAG system to process massive amounts of text
4. **Off-target similarity** — Document might be 30% relevant to one paragraph, retrieved as 100% match

**Example:**
Your document is a 5,000-word research paper on machine learning. User asks "What is supervised learning?" You retrieve the entire 5,000-word paper, even though only one section (200 words) directly answers the question. RAG pipeline now drowns in irrelevant text.

### The Chunking Solution

Split documents into smaller, more focused pieces. Now:

1. **Only relevant sections** are retrieved
2. **Reduced noise** in context
3. **Better cost efficiency** — smaller vectors
4. **Improved precision** — answers based on focused context

---

## Chunking Fundamentals

### What is a "Good" Chunk?

A good chunk:

- Contains complete thought or concept
- Is self-contained (readable without surrounding context)
- Balances context with focus
- Preserves original meaning
- Relates logically to both surrounding chunks

### Where to Split?

Different document types have natural boundaries:

**Written documents:**

- Paragraphs
- Sections
- Subsections
- Sentences
- Character length (when nothing else works)

**Code:**

- Functions
- Classes
- Methods
- Code blocks
- Comment boundaries

**Structured data:**

- Records
- Entries
- Semantic blocks
- Definition groups

The goal: Respect natural boundaries when possible rather than cutting arbitrarily.

---

## Chunking Strategies

### Strategy 1: Fixed-Size Chunking (Pure Character Count)

Split document every N characters or tokens, regardless of meaning.

**Example:** "Split every 500 tokens"

**Pros:**

- Simple to implement
- Predictable output
- Minimal computation

**Cons:**

- May cut sentences in half
- Loses semantic meaning
- Can create useless chunks
- Loses natural structure

**When to use:** Quick baseline, simple documents, when you don't know the content structure

**Example breakdown:**

```
Document: "Chapter 1: Introduction to ML. ML is..."
Chunk 1: "Chapter 1: Introduction to ML. ML is teaching computers..."
Chunk 2: "...from data through examples. Background: Historical..." (mid-sentence!)
```

### Strategy 2: Sliding Window (Fixed Size with Overlap)

Split into chunks of fixed size, but overlap between chunks.

**Example:** "Split 512 tokens at a time, with 100 token overlap"

**How it works:**

```
Tokens:  [1...100][101...612] overlap [513...1024][925...1436]
         Chunk 1      Chunk 2        etc.
```

The overlap ensures that concepts appearing at chunk boundaries exist in multiple chunks, improving recall.

**Pros:**

- Better recall (concepts in multiple chunks)
- Still simple to implement
- Respects token boundaries
- Works for most use cases

**Cons:**

- Still ignores semantic meaning
- May duplicate retrieval
- Still loses natural structure

**When to use:** Most practical applications, good balance of simplicity and quality

### Strategy 3: Semantic Chunking (Context-Aware)

Split at topic/concept boundaries, not arbitrary boundaries.

**How it works (conceptually):**

1. Identify natural boundaries (paragraph breaks, section headers, topic changes)
2. Split at those boundaries
3. Adjust size if chunks are too small or large

**Pros:**

- Respects document structure
- Maintains semantic integrity
- Better retrieval quality (chunks stay focused)
- Most natural for users

**Cons:**

- More complex to implement
- Requires understanding document structure
- Different per document type
- Potentially more expensive

**When to use:** High-quality systems, when document structure is consistent, when quality matters more than cost

---

## The Chunk Size Trade-off

### Small Chunks (100-200 tokens)

**Characteristics:**

- Very focused, specific concepts
- Lots of chunks per document
- High precision, low noise

**Pros:**

- Very precise retrieval
- Minimal irrelevant context
- Cheaper per-token basis? Sort of...

**Cons:**

- Many chunks = many embeddings = high cost
- Longer retrieval time
- May lack context (question answerers need surrounding context)
- Can be too fragmented

**When to use:** Short, factual documents like FAQs or knowledge bases

### Medium Chunks (300-600 tokens)

**Characteristics:**

- Balanced focus
- Reasonable chunk count
- Good precision and context

**Pros:**

- Good balance of cost and quality
- Chunks contain enough context
- Retrieval results are focused
- Standard choice for most applications

**Cons:**

- May still include some noise
- Manual tuning might improve it

**When to use:** Default choice for most use cases

### Large Chunks (1000+ tokens)

**Characteristics:**

- Multiple concepts per chunk
- Few chunks per document
- Lower precision, more context

**Pros:**

- Fewer chunks = fewer embeddings = lower cost
- Chunks have lots of surrounding context
- Good for long-form answers

**Cons:**

- Retrieved results include lots of irrelevant context
- RAG pipeline must process more text
- May confuse LLM with mixed concepts
- Sometimes less accurate

**When to use:** Long-form documents where full context is needed, when cost is critical constraint

---

## The Overlap Question

### Overlap Purpose

When you split a document at a boundary, a concept sometimes straddles the boundary:

```
Chunk 1: "...machine learning is teaching computers..."
Chunk 2: "...to learn from data. This is called supervised learning..."
Problem: The concept "machine learning" is only in chunk 1,
         but a query about "computer learning" might not retrieve chunk 2.
```

With overlap:

```
Chunk 1: "...machine learning is teaching computers to learn from data..."
Chunk 2: "...teach computers to learn from data. This is called supervised..." (overlaps!)
Now: Same concept appears in both chunks!
```

### Overlap Strategy

**Recommended:** 50-100 token overlap

**Why:**

- Captures concepts that span chunk boundaries
- Improves recall (fewer missed documents)
- Doesn't waste too much space on duplication
- Good balance for most document types

---

## Preserving Metadata Through Chunking

### The Problem

When you chunk a document, you create multiple vectors. Each needs metadata:

```
Original:
- Document ID: "doc_001"
- Title: "Machine Learning Basics"
- Author: "Jane"
- Source: "training_docs"

After chunking into 5 chunks:
- Chunk 1 needs: same metadata + "chunk_number: 1"
- Chunk 2 needs: same metadata + "chunk_number: 2"
- etc.
```

### What Metadata to Keep

**Essential:**

- Document ID (can be traced back to full document)
- Chunk number (which part of the document is this)
- Original text (for user retrieval)

**Helpful:**

- Source (where did this document come from?)
- Document title (context for user)
- Author/Date (attribution, freshness)
- Category/Tags (filtering, domain knowledge)

### Practical Impact

Without metadata:

```
Retrieval: Returns vector 0.89 similarity score
User: "Where did this come from? Can I see the original?"
System: *silence* (no information)
```

With metadata:

```
Retrieval: Returns vector 0.89, from doc_001 chunk 3, titled "ML Basics"
User: "Oh, that's from the training document. Got it!"
```

---

## Cost and Quality Considerations

### Cost Factors

**Embeddings:**

- Proportional to total tokens: 1000 tokens = embeddings cost, regardless of chunk size
- Smaller chunks (more of them) = same total cost
- **But:** Handling, retrieval, storage costs vary

**Storage:**

- More chunks = more metadata storage
- Small difference unless you have millions of chunks

**Retrieval:**

- More chunks = more potential to retrieve (good)
- More context to process (bad)
- Slight cost increase but usually worth it

### Quality Impact

The biggest impact: Retrieval quality

**Too small:** Chunks lack context for question answering
**Too large:** Chunks include irrelevant noise
**Just right:** Maximum relevant information, minimum noise

---

## Practical Optimization

### Measuring Success

To evaluate your chunking strategy:

1. **Create test queries** (5-10 meaningful questions)
2. **For each chunk size/strategy**, measure:
   - Retrieval precision (are retrieved chunks relevant?)
   - Retrieval recall (do we find all relevant chunks?)
   - End-to-end answer quality (LLM's final answer)
3. **Compare** to find the best strategy for your data

### Experimentation Flow

1. **Start with medium chunks (512 tokens)** — Good baseline
2. **Test with real queries** — Does it work?
3. **If precision too low** → Increase chunk size or improve chunking strategy
4. **If recall too low** → Decrease chunk size or add overlap
5. **If cost too high** → Try larger chunks
6. **If quality too low** → Try semantic chunking

---

## Document-Type Specific Guidance

### Scientific Papers

- Chunk at section boundaries
- Preserve abstract separately
- Medium chunks (400-600 tokens)
- High overlap (100 tokens)

### Technical Documentation

- Chunk at section/subsection boundaries
- Keep examples with explanations
- Medium chunks (350-500 tokens)
- Medium overlap (50 tokens)

### Long-form Content (Blog, Books)

- Chunk at paragraph boundaries + heading boundaries
- Larger chunks (600-1000 tokens)
- Lower overlap (50 tokens)

### FAQs / Knowledge Bases

- Each Q&A is one chunk (naturally)
- Vary by content length
- Minimal overlap (just in case)

---

## Key Takeaways

Test different strategies:

1. Fixed-size: Simple, fast, consistent
2. Sliding window: Overlap prevents boundary artifacts
3. Semantic: Chunks based on topic boundaries

Measure retrieval quality:

- MRR (Mean Reciprocal Rank)
- nDCG (Normalized Discounted Cumulative Gain)

Choose strategy that maximizes quality within cost budget

---

## Implementation Guide

### Core Chunking Functions

```typescript
// Simple fixed-size chunking (good for most cases)
function fixedSizeChunks(
  text: string,
  chunkSize?: number, // Default: 512 tokens (~2000 chars)
): string[];

// Overlapping chunks preserve context at boundaries
function slidingWindowChunks(
  text: string,
  chunkSize?: number, // Default: 512 tokens
  overlap?: number, // Default: 100 tokens (20% overlap)
): string[];

// Topic-aware chunking (more sophisticated)
function semanticChunks(
  text: string,
  minChunkSize?: number, // Don't create tiny chunks
): string[];
```

### Strategy Comparison

| Strategy   | Complexity | Quality   | Cost   | Best For                  |
| ---------- | ---------- | --------- | ------ | ------------------------- |
| Fixed-size | Low        | Okay      | Low    | Initial testing, baseline |
| Sliding    | Low        | Good      | Medium | Most text documents       |
| Semantic   | High       | Excellent | High   | High-quality systems      |

**Recommendation:** Start with sliding window (good balance of simplicity and quality).

### Document-Specific Guidance

**Scientific papers:**

- Semantic chunking by section (abstract, intro, methods, results, conclusion)
- Keeps each section focused on specific topic

**Code:**

- Split at method/function boundaries
- Respects code structure naturally

**Knowledge bases/FAQs:**

- One Q&A per chunk (naturally semantic)
- Vary size based on content

**Web content:**

- Use HTML structure (div, article tags) as boundaries
- Preserve semantic hierarchy

```typescript
function semanticChunksByHeaders(text: string): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const line of lines) {
    // Detect markdown headers or topic breaks
    if (line.match(/^#+\s/) && currentChunk.trim()) {
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += "\n" + line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Usage
const chunks = semanticChunksByHeaders(document);
console.log(`Created ${chunks.length} semantic chunks`);
```

**Best for:** Structured documents, papers with headers, documentation

---

## Strategy Comparison

### Metrics Table

| Metric               | Fixed Size | Sliding Window | Semantic   |
| -------------------- | ---------- | -------------- | ---------- |
| Simplicity           | ⭐⭐⭐⭐⭐ | ⭐⭐⭐         | ⭐⭐       |
| Speed                | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐       | ⭐⭐⭐     |
| Context Preservation | ⭐         | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Cost Efficiency      | ⭐⭐⭐⭐⭐ | ⭐⭐⭐         | ⭐⭐⭐⭐   |
| Retrieval Quality    | ⭐⭐⭐     | ⭐⭐⭐⭐       | ⭐⭐⭐⭐⭐ |
| Implementation       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐         | ⭐⭐       |

### Cost Comparison

```
Document: 10,000 tokens

Fixed-size (512 tokens):
- Chunks: 10,000 / 512 = 20 chunks
- Embedding cost: 20 × $0.000002 = $0.00004
- ✅ Cheapest

Sliding window (512, 100 overlap):
- Chunks: ~25 chunks (higher due to overlap)
- Embedding cost: 25 × $0.000002 = $0.00005
- ⚠️ 25% more expensive

Semantic (variable size):
- Chunks: ~15 chunks (depends on structure)
- Embedding cost: 15 × $0.000002 = $0.00003
- ✅ Best cost, assumes good structure
```

### Quality Comparison (Example Results)

```
Retrieval Quality Test (measuring nDCG):

Question: "What is machine learning?"

Fixed-size strategy:
- MRR: 0.75 (75th percentile answer)
- nDCG: 0.82
- Reason: Some chunks incomplete

Sliding window strategy:
- MRR: 0.88 (88th percentile)
- nDCG: 0.89
- Reason: Overlap preserves context

Semantic strategy:
- MRR: 0.92 (92nd percentile)
- nDCG: 0.91
- Reason: Topically coherent chunks
```

---

## Implementation: Core Functions

Implement these chunking strategies:

```typescript
// Simple fixed-size chunking
function fixedSizeChunks(text: string, chunkSize?: number): string[];

// Better: overlapping chunks
function slidingWindowChunks(
  text: string,
  chunkSize?: number,
  overlap?: number,
): string[];

// Best: topic-aware semantic chunking
function semanticChunks(text: string, minChunkSize?: number): string[];

// Evaluate strategy effectiveness
function evaluateStrategy(
  strategy: ChunkingMethod,
  text: string,
): ChunkingMetrics;
```

**Testing approach:**

1. Split document using each strategy
2. Measure: number of chunks, average size, total cost
3. Use Tutorial 07 evaluation metrics on real queries
4. Pick winner (best quality within budget)

---

## Real-World Patterns

**Adaptive chunk size:**

- Short docs (<1K tokens): 256-token chunks
- Medium docs (5K tokens): 512-token chunks
- Long docs (20K tokens): 768-token chunks
- Very long docs: 1024-token chunks

**Overlap guidance:**

- Technical/legal: 20-30% overlap (preserve context)
- General text: 15% overlap (balanced)
- Fiction: 10% overlap (natural breaks exist)

**Metadata preservation:**
Each chunk should retain: document ID, chunk number, start/end position

---

## Common Issues & Solutions

| Problem                  | Cause                     | Fix                     |
| ------------------------ | ------------------------- | ----------------------- |
| Chunks too small         | Small chunk size          | Increase to 512+ tokens |
| Retrieval misses context | No overlap                | Add 15-20% overlap      |
| Cost too high            | Many small chunks         | Increase chunk size     |
| Incoherent chunks        | Fixed size cuts mid-topic | Use sliding or semantic |

---

## Quick Start Guide

**Recommended approach (good balance):**

1. **Start:** Use sliding window with 512-token chunks, 100-token overlap
2. **Measure:** Use Task 07 metrics on 5-10 test questions
3. **Adjust:** If quality too low, try semantic. If cost too high, increase chunk size
4. **Finalize:** Document your chosen strategy and rationale

**Cost estimation:**

- Fixed 512-token chunks: baseline cost
- Sliding window (20% overlap): ~1.2x baseline
- Semantic chunking: ~0.8x baseline (fewer chunks)

---

## Next Steps

1. **After this tutorial:** Move to Task 07 to measure chunk quality
2. **Then:** Apply optimal chunks in Task 05 (RAG)
3. **Advanced**: Combine with Task 08 optimizations
