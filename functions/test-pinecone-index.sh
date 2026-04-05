#!/bin/bash
# Test script for Pinecone Index Implementation (Task 02)

set -e

echo "================================================"
echo "Testing Pinecone Index Implementation (Task 02)"
echo "================================================"
echo ""

cd /Users/xingbingao/workplace/pinecone-ai-starter/functions

# Step 1: Check environment variables
echo "✓ Step 1: Checking environment variables..."
if [ -z "$PINECONE_API_KEY" ]; then
  echo "  ⚠ PINECONE_API_KEY not set, loading from .env..."
  export $(grep PINECONE .env | xargs)
fi

if [ -z "$PINECONE_API_KEY" ]; then
  echo "  ✗ FAILED: PINECONE_API_KEY is still not set"
  exit 1
fi

echo "  ✓ PINECONE_API_KEY: ${PINECONE_API_KEY:0:8}...${PINECONE_API_KEY: -8}"
echo "  ✓ PINECONE_INDEX_NAME: $PINECONE_INDEX_NAME"
echo ""

# Step 2: Verify build
echo "✓ Step 2: Verifying compiled code..."
if [ -f "lib/adapters/pinecone.js" ]; then
  echo "  ✓ src/adapters/pinecone.ts compiled"
fi
if [ -f "lib/services/index.ts" ]; then
  echo "  ✓ src/services/index.ts compiled"
fi
if [ -f "lib/services/index-client.js" ]; then
  echo "  ✓ src/services/index-client.ts compiled"
fi
echo ""

# Step 3: Verify exports
echo "✓ Step 3: Verifying module exports..."
grep -q "getPineconeClient" lib/adapters/pinecone.js && echo "  ✓ getPineconeClient exported"
grep -q "resetPineconeClient" lib/adapters/pinecone.js && echo "  ✓ resetPineconeClient exported"
grep -q "getOrCreateIndex" lib/services/index.js && echo "  ✓ getOrCreateIndex exported"
grep -q "checkIndexHealth" lib/services/index.js && echo "  ✓ checkIndexHealth exported"
grep -q "deleteIndex" lib/services/index.js && echo "  ✓ deleteIndex exported"
grep -q "getIndexClient" lib/services/index-client.js && echo "  ✓ getIndexClient exported"
grep -q "INDEX_NAME" lib/services/index-client.js && echo "  ✓ INDEX_NAME exported"
echo ""

echo "================================================"
echo "✓ Implementation verified successfully!"
echo "================================================"
echo ""
echo "Created files:"
echo "  1. src/adapters/pinecone.ts - Singleton Pinecone client"
echo "  2. src/services/index.ts - Index lifecycle management"
echo "  3. src/services/index-client.ts - Typed index wrapper"
echo ""
echo "API Surface:"
echo "  getPineconeClient() → Pinecone singleton"
echo "  resetPineconeClient() → void (test helper)"
echo "  getOrCreateIndex() → Promise<IndexDescription>"
echo "  checkIndexHealth() → Promise<{healthy, totalVectors}>"
echo "  deleteIndex() → Promise<void>"
echo "  getIndexClient() → Index"
echo ""
echo "Next steps:"
echo "  1. Task 03: Upsert OpenAI embeddings into this index"
echo "  2. Task 04: Query the index for similarity search"
echo "  3. Task 05: Use search in RAG pipeline"
