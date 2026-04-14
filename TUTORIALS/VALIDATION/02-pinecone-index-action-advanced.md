# Task 02 — Pinecone Index [Action Steps]

## Implementation Steps

### Step 1: Create Client Adapter (cheap singleton)

**File:** `src/adapters/pinecone.ts`

```ts
import { Pinecone } from "@pinecone-database/pinecone";

// Singleton: Returns cached client or initializes new one
export function getPineconeClient(): Pinecone;

// Reset cached client (for testing)
export function resetPineconeClient(): void;
```

**Implementation notes:**

- `getPineconeClient()` validates `PINECONE_API_KEY` env var
- Caches client to avoid recreating on each call
- Throws if API key is missing or invalid

---

### Step 2: Create Index Lifecycle Service

**File:** `src/services/index.ts`

```ts
import { Pinecone, IndexDescription } from "@pinecone-database/pinecone";
import { getPineconeClient } from "../adapters/pinecone";

// Configuration
const CFG_NAME = process.env.PINECONE_INDEX_NAME ?? "rag-documents";
const CFG_DIMENSION = 1536;
const CFG_METRIC = "cosine";

// Get or create index if doesn't exist
export async function getOrCreatePineconeIndex(): Promise<IndexDescription>;

// Check if index is healthy and get vector count
export async function checkIndexHealth(
  name?: string,
): Promise<{ healthy: boolean; totalVectors: number }>;

// Delete index (requires CONFIRM_DELETE=true env var)
export async function deletePineconeIndex(name?: string): Promise<void>;
```

**Implementation notes:**

- `getOrCreatePineconeIndex()` checks existence, creates if needed, polls for Ready status
- `checkIndexHealth()` retrieves index stats from Pinecone
- `deletePineconeIndex()` requires safety confirmation flag

---

### Step 3: Create Typed Index Wrapper (for Task 03)

**File:** `src/services/index-client.ts`

```ts
import { Pinecone } from "@pinecone-database/pinecone";
import { getPineconeClient } from "../adapters/pinecone";

export const INDEX_NAME = process.env.PINECONE_INDEX_NAME ?? "rag-documents";

// Get typed index client for upsert/query operations
export function getPineconeIndexClient(): Pinecone.Index<Pinecone.RecordMetadata>;

// Metadata attached to each vector
export interface VectorMetadata {
  text: string; // Original text content
  documentId: string; // Source document ID
  chunkIndex: number; // Chunk position if split
  source?: string; // Source URL or identifier
  timestamp?: number; // When indexed
}

// Vector ready for upsert (embedding + metadata)
export interface UpsertVector {
  id: string; // Unique vector ID
  values: number[]; // 1536-dimensional embedding
  metadata?: VectorMetadata; // Associated metadata
}
```

---

### Step 4: Install Pinecone SDK

```bash
npm install @pinecone-database/pinecone
```

---

### Step 5: Configure Environment Variables

Add to `.env` or `.env.local`:

```bash
PINECONE_API_KEY="pcsk_..."
PINECONE_INDEX_NAME="rag-documents"
PINECONE_ENVIRONMENT="us-east-1-aws"
```

Get your API key from: https://app.pinecone.io

---

### Step 6: Test Implementation

Run this test to verify the setup:

```bash
export PINECONE_API_KEY="pcsk_..."
export PINECONE_INDEX_NAME="test-index"

npx ts-node -e '
import { getOrCreatePineconeIndex, checkIndexHealth } from "./src/services/index";
(async () => {
  const idx = await getOrCreatePineconeIndex();
  console.log("✓", idx.name, idx.dimension, idx.metric);
  const health = await checkIndexHealth();
  console.log("✓ health", health);
})()
'
```

**Expected output:**

```
✓ test-index 1536 cosine
✓ health { healthy: true, totalVectors: 0 }
```

---

## Validation Checklist

- [ ] `src/adapters/pinecone.ts` created with singleton client
- [ ] `src/services/index.ts` created with lifecycle functions
- [ ] `src/services/index-client.ts` created with typed wrapper
- [ ] Pinecone SDK installed (`@pinecone-database/pinecone`)
- [ ] Environment variables configured (`.env`)
- [ ] Test passes with correct index created
- [ ] Index status is "Ready"
- [ ] Health check returns `{healthy: true, totalVectors: 0}`

---

## Troubleshooting

| Error                                              | Solution                                                     |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `Missing/short PINECONE_API_KEY`                   | Verify API key in `.env` is set and starts with `pcsk_`      |
| `UNAUTHENTICATED`                                  | API key format invalid; get from https://app.pinecone.io     |
| `already exists`                                   | Delete existing index or use different `PINECONE_INDEX_NAME` |
| `Index creation timeout`                           | Check Pinecone console; may take longer on first creation    |
| `quota exceeded`                                   | Free tier allows 1 index only; upgrade or delete existing    |
| `Cannot find module '@pinecone-database/pinecone'` | Run `npm install @pinecone-database/pinecone`                |
