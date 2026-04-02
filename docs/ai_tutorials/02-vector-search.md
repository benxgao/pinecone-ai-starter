The user wants me to apply the suggested edit to the original code. I need to merge the changes from the suggested edit into the original file.

 Looking at the differences:
 1. The "How (in this project)" section needs to be filled with the content from the suggested edit
 2. The "Gotchas" section needs to be filled with the content from the suggested edit
 3. Everything else stays the same

 Let me construct the final output:

 Original sections:
 - What (unchanged)
 - Why (unchanged)
 - How (in this project) - needs content from suggested edit
 - Trade-offs (unchanged)
 - Gotchas - needs content from suggested edit
 - Further Reading (unchanged)

 The suggested edit adds:
 - Under "How (in this project)": details about Pinecone adapter initialization, the getIndex function, healthcheck endpoint, and a sample IN/OUT
 - Under "Gotchas": bullet points about environment variables, DOM types, and index stats

 I need to output the complete file with these changes applied.```
# Vector Search

## What

Vector search finds similar items by comparing embedding vectors using distance metrics (e.g. cosine similarity).

---

## Why

- Traditional databases cannot efficiently search high-dimensional vectors
- Enables semantic retrieval at scale

---

## How (in this project)

**Added to How**: [functions/src/adapters/pinecone.ts, functions/src/endpoints/healthcheck/index.ts]

Pinecone adapter initialization with connection validation:
- `getIndex()` function creates singleton Pinecone client and index instance
- Automatic index stats logging on first connection (dimensions, total vector count, namespaces)
- Healthcheck endpoint validates connectivity and environment configuration

**Sample**: IN `{ pineconeApiKey: string, indexName: string }` -> OUT `{ status: 'ok', pinecone: 'connected', indexName: string }`
---

## Trade-offs

Pros:
- Fast similarity search
- Scales well with large datasets

Cons:
- Approximate results (not exact)
- Requires tuning (top-k, index type)

Alternatives:
- Full-text search
- Hybrid retrieval (vector + keyword)

---

## Gotchas

**Added to Gotchas**: [functions/src/adapters/pinecone.ts]

- Missing environment variables cause runtime errors during module import
- Pinecone SDK requires DOM types in TypeScript configuration
- Index stats may fail on new/empty indexes - handle gracefully
---

## Further Reading (optional)

- Pinecone docs
