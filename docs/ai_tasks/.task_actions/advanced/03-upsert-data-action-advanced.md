# Task 03 — Upsert Data [advanced] - Action Steps

## Prerequisites

- Complete Task 01 (OpenAI Embeddings) and Task 02 (Pinecone Index)
- Have OpenAI API key and Pinecone index configured
- Read `docs/ai_tasks/_meta.md` before proceeding

## Step 1: Create Document Loader Service

Create `src/services/document-loader.ts` with document loading functions:

```bash
# Create the services directory if it doesn't exist
mkdir -p src/services
```

Create the file with:

- `loadDocumentsFromJSON()` - Load and validate JSON documents
- `loadDocumentsFromCSV()` - Load documents from CSV files
- `loadDocumentsFromAPI()` - Load documents from API endpoints
- Document interface with `id`, `text`, and optional `metadata`

## Step 2: Create Upsert Service

Create `src/services/upsert.ts` with upsert pipeline:

```bash
# Create the upsert service
touch src/services/upsert.ts
```

Implement:

- `embedDocuments()` - Embed documents with cost tracking
- `upsertBatch()` - Batch upsert vectors to Pinecone
- `upsertDocuments()` - Main pipeline function
- Interfaces: `UpsertOptions`, `UpsertMetrics`
- Default options: batchSize=100, rateLimitMs=100

## Step 3: Create CLI Command

Create `src/commands/upsert.ts`:

```bash
# Create commands directory
mkdir -p src/commands
touch src/commands/upsert.ts
```

Implement CLI that:

- Takes JSON file path as argument
- Loads documents using `loadDocumentsFromJSON()`
- Calls `upsertDocuments()` with conservative settings
- Displays final metrics

## Step 4: Test Implementation

### Test 1: Basic Upsert

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

### Test 2: Verify in Pinecone

Create verification script:

```typescript
import { getPineconeIndexClient } from "./src/services/index-client";

async function verify() {
  const index = getPineconeIndexClient();
  const stats = await index.describeIndexStats();
  console.log(`Total vectors: ${stats.totalVectorCount}`);
}

verify();
```

### Test 3: Error Handling

Test error scenarios:

```bash
# Invalid documents (missing id)
cat > invalid-docs.json << 'EOF'
[{ "text": "Missing id field" }, { "id": "doc-2", "text": "Valid" }]
EOF
npx ts-node src/commands/upsert.ts invalid-docs.json

# Empty documents
echo "[]" > empty-docs.json
npx ts-node src/commands/upsert.ts empty-docs.json
```

## Step 5: Verify Success Criteria

✅ Documents loaded correctly from JSON  
✅ All documents embedded (3 embeddings created)  
✅ All vectors upserted to Pinecone  
✅ Metrics reported accurately (time, cost, count)  
✅ Pinecone stats show total_vectors increased  
✅ Metadata preserved in vectors  
✅ Errors handled gracefully

## Step 6: Optional Enhancements

- Implement CSV loading support
- Add API endpoint loading
- Test with larger document sets
- Experiment with different batch sizes
- Implement incremental upsert pattern
- Add checkpoint system for resume capability

## Next Task

Proceed to Task 04: Query Similarity after successful completion
