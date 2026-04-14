---
notes: Training tutorial - focus on RAG concepts and benefits
---

# Tutorial 05 — Retrieval-Augmented Generation (RAG)

## What You'll Learn

In this tutorial, you'll understand:

- **What RAG is and why it matters** — The architecture that makes AI systems reliable
- **How RAG prevents hallucination** — Why giving context reduces false information
- **The complete RAG pipeline** — Five stages from question to answer
- **Prompt engineering for RAG** — How to guide the model's behavior
- **Context window management** — Balancing information and constraints
- **End-to-end system design** — Putting all components together
- **Real-world RAG patterns** — How production systems work
- **RAG trade-offs** — Speed, quality, cost decisions

---

## The Core Problem: AI Hallucination

### What is Hallucination?

When an AI language model generates false information as if it were true, with full confidence.

**Example:**

```
Q: "What does your company do?"
LLM (without grounding): "Your company builds robots for space exploration and sells them on Mars."
Reality: Your company makes software tools for developers.
```

The model sounds confident, but it's wrong. It "hallucinated" a plausible-sounding answer.

### Why Hallucination Happens

Language models are trained to predict the next most likely word. They're very good at this. But "likely next word" ≠ "true statement."

The model has no concept of ground truth. It has never seen your document collection. It's generalizing from its training data, which might be incomplete or outdated.

---

## The RAG Solution

### How RAG Works at a High Level

Instead of asking the model to answer from memory, you:

1. **Retrieve** relevant documents from your collection
2. **Include** those documents in the prompt
3. **Ask** the model to answer based only on those documents

The model then learns to copy or summarize from the provided context rather than hallucinate.

### The Five-Stage Pipeline

**Stage 1: Embed the Question**

- Convert user question to embedding vector
- Same model used for embedding documents

**Stage 2: Retrieve Relevant Documents**

- Search for top-K most similar documents
- Return both the content and similarity scores

**Stage 3: Format Context**

- Take retrieved documents
- Format them into readable context
- Prepare for inclusion in prompt

**Stage 4: Build the Prompt**

- Create system instructions
- Include the formatted context
- Include the user question
- Clear instructions to only use provided context

**Stage 5: Generate Answer**

- Send prompt to language model
- Model generates response based on provided context
- Return answer to user

---

## Why RAG Reduces Hallucination

### Pure LLM: No Guardrails

```
User: "What does RAG mean?"
LLM thinks: "I'll search my training data memory..."
LLM happens to generate: "RAG is Really Amazing Gadgets"
User: "That doesn't sound right..."
Reality: RAG is Retrieval-Augmented Generation
```

The model made something up.

### RAG-Based System: Grounded

```
User: "What does RAG mean?"
System: Searches for "RAG" in your documents
System: Finds document saying "RAG is Retrieval-Augmented Generation"
System: Builds prompt: "Based on: 'RAG is Retrieval-Augmented Generation', answer: What does RAG mean?"
LLM: Sees the provided text and uses it
LLM: "RAG is Retrieval-Augmented Generation"
User: ✓ Correct
```

The model respects the provided grounding.

---

## Key Concepts

### 1. The Retrieval Quality Matters Most

If your retrieval step returns irrelevant documents, the LLM has bad information to work with.

- Good retrieval → Good answers
- Bad retrieval → Bad answers, no matter how good your LLM is

This is why earlier tutorials on chunking, embeddings, and retrieval are crucial.

### 2. Prompt Engineering Affects Quality

Different prompts with the same context produce different qualities:

**Poor Prompt:**
"Answer this: " + context + " " + question

**Better Prompt:**

```
You are a helpful assistant. Based ONLY on the following documents, answer the question.
Do not use outside knowledge.
If the answer is not in the documents, say "I don't know."

Documents:
[formatted context]

Question:
[user question]

Answer:
```

The second prompt is much more effective because it:

- Sets expectations
- Gives clear instructions
- Warns about limitations
- Provides structure

### 3. Context Window is Your Budget

Language models have a maximum input length (context window):

- GPT-3.5: ~4,000 tokens (roughly 3,000 words)
- GPT-4: ~8,000 tokens
- GPT-4 Turbo: ~128,000 tokens

You must budget:

- System prompt (instructions)
- Retrieved context
- User question
- Space for the answer

If you exceed the limit, the API rejects your request.

**Example Budget (GPT-3.5, 4K tokens):**

- System prompt: 200 tokens
- Retrieved 5 documents, ~200 tokens each = 1,000 tokens
- Question: 50 tokens
- Buffer for answer: 300 tokens
- **Available for context: ~1,000 tokens** (not unlimited!)

This impacts how many documents you can retrieve.

### 4. Similarity Scores Guide Relevance

When your retrieval returns documents with scores:

- 0.95 = Highly relevant, include in context
- 0.75 = Decent relevance, probably include
- 0.50 = Questionable, might want to filter out
- 0.30 = Probably noise, don't include

You can filter based on score thresholds to manage context size and quality.

---

## Real-World RAG Patterns

### Pattern 1: Basic RAG (Most Common)

- Retrieve top-K documents
- Include all of them in context
- Ask question
- Simple, effective, works well

### Pattern 2: Iterative RAG

- First retrieval with standard query
- If unsatisfied, refine query or retrieve more context
- Ask again
- More involved, better quality

### Pattern 3: Multi-Stage RAG

- Initial retrieval (broad)
- Reranking step (score more carefully)
- Final context assembly
- Most complex, highest quality

---

## Common RAG Challenges

### Challenge 1: Too Little Context

**Symptom:** System can't find relevant information

**Why:** Retrieval got low-quality results or topK was too small

**Solutions:**

- Improve chunking strategy
- Adjust embedding model
- Increase topK
- Add query expansion

### Challenge 2: Too Much Context

**Symptom:** Ran out of context window

**Why:** Retrieved too many documents or full documents are too long

**Solutions:**

- Decrease topK
- Use smaller chunks
- Filter with score thresholds
- Summarize retrieved documents

### Challenge 3: Wrong Context Retrieved

**Symptom:** Retrieved documents aren't actually relevant

**Why:** Embedding model mismatch, poor document representation, terminology differences

**Solutions:**

- Check embedding consistency
- Improve document preparation
- Better metadata and chunking
- Query expansion (covered in Tutorial 08)

---

## Implementation Guide

The RAG system consists of these core components:

```typescript
// Core data types
interface RAGResult {
  question: string;
  answer: string;
  sources: Array<{ id: string; text: string; score: number }>;
  tokensUsed: number;
  duration: number;
}

// Main RAG function - coordinates all stages
async function ask(question: string): Promise<RAGResult>;

// Helper functions for each stage
function retrieveDocuments(
  query: string,
  topK: number,
): Promise<RetrievalResult[]>;
function assembleContext(sources: RetrievalResult[]): string;
function buildSystemPrompt(context: string): string;
function generateAnswer(
  systemPrompt: string,
  userQuestion: string,
): Promise<string>;
```

**The five-stage pipeline:**

1. **Input validation** - Ensure question is not empty
2. **Retrieve documents** - Call semantic search (top-3)
3. **Assemble context** - Format documents into readable text
4. **Build prompt** - Create system instructions + context + question
5. **Generate answer** - Call LLM with complete prompt

### Key Implementation Details

**System prompt structure:**

- Clear instructions to use ONLY provided documents
- Instruction to say "I don't know" if answer not available
- Guidance to cite sources
- Word limit (1-2 paragraphs)

**Context budgeting:**

Given GPT-4's context window (~8,000 tokens):

- System instructions: ~200 tokens
- Each document (top-3): ~300 tokens each = ~900 tokens
- User question: ~50 tokens
- Buffer for response: ~300 tokens
- **Available for context: ~6,500 tokens** before exceeding limit

**Error handling:**

- No documents found → Return honest answer "I don't have information"
- LLM errors → Surface error to user
- Token limits → Filter documents or reduce topK
  question: trimmedQuestion,
  answer,
  sources: sources.map((s) => ({
  id: s.id,
  text: s.text.substring(0, 150), // Truncate for readability
  score: s.score,
  })),
  tokensUsed,
  duration,
  };
  } catch (error) {
  const duration = Date.now() - startTime;

      if (error instanceof Error) {
        console.error(`\

  ❌ RAG Pipeline Error: ${error.message}`);
      throw new Error(`RAG failed: ${error.message}`);
  }

      throw error;

  }
  }

````

### API Endpoint Pattern

**Endpoint to implement:**

```typescript
// POST /api/rag/ask
// Request: { "question": "What is machine learning?" }
// Response:
// {
//   "question": "...",
//   "answer": "...",
//   "sources": [{ "id": "doc-1", "text": "...", "score": 0.92 }],
//   "tokensUsed": 145,
//   "duration": 1250
// }

async function askEndpoint(req: Request, res: Response): Promise<void> {
  // 1. Validate question parameter
  // 2. Call ask() service
  // 3. Return formatted response
  // 4. Handle errors appropriately
}
````

**Validation checks needed:**

- Question is provided and non-empty
- Question is a string (not number, object, etc.)
- Question length reasonable (max 1000 chars)
- Rate limiting to prevent abuse

### Testing Your RAG Implementation

Once you've built the RAG service:

1. **Setup sample data** - Seed your Pinecone index with test documents
2. **Test basic flow** - Ask simple questions and verify answers with sources
3. **Test edge cases** - Ask questions outside your knowledge base, verify honest "I don't know" response
4. **Check quality** - Use evaluation metrics (Tutorial 07) to measure accuracy

**Success indicates:**

- Answers are grounded in retrieved documents (not hallucinating)
- Sources include relevant document references
- Latency is reasonable (<2 seconds)
- Unknown questions get appropriate "I don't have information" responses

### Testing Strategies

**Test direct topic match:**
Question asks about something directly covered in your documents. Verify you get accurate answers with high-confidence sources.

**Test semantic variations:**
Ask the same question using different words. RAG should still retrieve and answer correctly due to embedded semantics.

**Test multi-topic questions:**
Questions combining multiple concepts. Verify retrieval finds relevant documents across topics.

**Test off-topic questions:**
Ask questions completely outside your knowledge base. System should honestly say "I don't have information" rather than hallucinating.

**Latency measurement:**

- Embedding: ~100-200ms
- Retrieval: ~50-100ms
- LLM generation: ~1-2 seconds
- **Total: ~2-3 seconds** per question
- Returns generated answer

---

## Prompt Engineering Patterns

### Pattern 1: Basic System Prompt

```typescript
const basicPrompt = `You are a helpful assistant.
Answer the question using only the provided context.
If you cannot answer from context, say \"I don't know.\"`;
```

### Pattern 2: Context-First Prompt

```typescript
const contextFirstPrompt = `You have access to the following documents:

${context}

Based ONLY on these documents, answer the question.
Do not use outside knowledge.`;
```

### Pattern 3: Role-Based Prompt

```typescript
const roleBasedPrompt = `You are a technical documentation assistant.
Your role: Answer technical questions using only provided documentation.
Style: Clear, concise, professional.
Constraint: Never add information not in the documents.`;
```

### Pattern 4: Examples-Based Prompt (Few-shot)

```typescript
const examplesPrompt = `${context}

Example Q&A:
Q: Simple question?
A: Direct answer from documents.

Q: Complex question?
A: Answer citing specific sections.

Now answer this question: ${question}`;
```

---

## Cost Analysis

### Per-Request Breakdown

```
Embedding question (~50 tokens):
  Cost: 50 * ($0.02 / 1M) = $0.000001

LLM Generation (~200 tokens prompt + 150 answer):
  Input: 200 * ($0.50 / 1M) = $0.0001
  Output: 150 * ($1.50 / 1M) = $0.000225
  Total: $0.000325

Total per request: ~$0.00033

For 1000 requests/month: $0.33
```

**Conclusion:** Cost is negligible. Focus on quality, not cost optimization.

---

## Common Issues & Solutions

| Problem                           | Cause               | Solution                                |
| --------------------------------- | ------------------- | --------------------------------------- |
| \"No relevant documents\"         | Retrieved 0 results | Check sample data seeded, adjust topK   |
| \"Answer doesn't match question\" | Poor retrieval      | Use evaluation (Task 07) to diagnose    |
| \"LLM ignoring context\"          | Bad system prompt   | Add explicit \"ONLY\" language          |
| \"Timeout (>3s)\"                 | Slow LLM call       | OK for RAG, consider async for UX       |
| \"No sources returned\"           | Missing metadata    | Ensure docs have metadata during upsert |
| \"Hallucinated facts\"            | Weak system prompt  | Strengthen constraint language          |

---

## Advanced Patterns

### Pattern 1: Multi-Query Expansion

````typescript
export async function askWithQueryExpansion(question: string) {
  // Generate alternative queries
  const variations = await generateQueryVariations(question);

### Advanced Patterns

**Pattern 1: Query Expansion**

Instead of searching for the exact user question, generate variations and search for all of them:

```typescript
// Generate query variations
function generateQueryVariations(question: string): string[]

// Search with all variations
async function askWithExpansion(question: string): Promise<RAGResult>
````

Benefits: Catches documents using different terminology. Trade-off: 4-5x retrieval cost, 15-30% quality improvement.

**Pattern 2: Streaming Responses**

Stream LLM response to user immediately instead of waiting:

```typescript
// Stream answer chunks as LLM generates them
async function askStreaming(
  question: string,
  onChunk: (chunk: string) => void,
): Promise<RAGResult>;
```

Benefits: Faster perceived performance. Trade-off: More complex error handling.

---

## Key Configuration Parameters

**topK:** How many documents to retrieve

- Default: 3 (good balance)
- High-quality needs: 5
- When retrieval is poor: Keep at 3, fix retrieval instead

**Temperature:** LLM creativity (0=deterministic, 1=creative)

- Default: 0.7 (good for RAG)
- Factual needs: 0 (deterministic)
- Creative needs: 0.9

**Max tokens:** Maximum answer length

- Default: 500 (good for most Q&A)
- Adjust based on your needs

---

## Next Steps

**After this tutorial:**

1. Task 06: Improve chunking strategy for better retrieval
2. Task 07: Evaluate retrieval quality with metrics
3. Task 08: Advanced optimization techniques

**To improve your RAG quality:**

- Use evaluation metrics (Tutorial 07) to measure performance
- Adjust topK based on your data
- Experiment with system prompts
- Add domain-specific instructions
- Consider query expansion for better coverage
