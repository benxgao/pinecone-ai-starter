#!/bin/bash

# Test script for Task 04: Query Similarity
# Tests semantic search functionality

set -e

BASE_URL="${BASE_URL:-http://localhost:5001/PROJECT/us-central1}"
AUTH_TOKEN="${AUTH_TOKEN:-test}"

echo "======================================================"
echo "Task 04: Query Similarity - API Testing"
echo "======================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Get sample queries
echo -e "${YELLOW}Test 1: Get sample search queries${NC}"
echo "GET /api/search/sample"
echo ""

SAMPLE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/search/sample" \
  -H "auth_token: $AUTH_TOKEN")

echo "$SAMPLE_RESPONSE" | jq '.' 2>/dev/null || echo "$SAMPLE_RESPONSE"
echo ""

# Test 2: Basic semantic search
echo -e "${YELLOW}Test 2: Basic semantic search${NC}"
echo "POST /api/search"
echo '{"query": "What is machine learning?", "topK": 3}'
echo ""

SEARCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/search" \
  -H "Content-Type: application/json" \
  -H "auth_token: $AUTH_TOKEN" \
  -d '{"query": "What is machine learning?", "topK": 3}')

echo "$SEARCH_RESPONSE" | jq '.' 2>/dev/null || echo "$SEARCH_RESPONSE"
echo ""

# Test 3: Search with filtering
echo -e "${YELLOW}Test 3: Search with score filtering (minScore=0.7)${NC}"
echo "POST /api/search"
echo '{"query": "embeddings and vectors", "topK": 5, "minScore": 0.7}'
echo ""

FILTERED_RESPONSE=$(curl -s -X POST "$BASE_URL/api/search" \
  -H "Content-Type: application/json" \
  -H "auth_token: $AUTH_TOKEN" \
  -d '{"query": "embeddings and vectors", "topK": 5, "minScore": 0.7}')

echo "$FILTERED_RESPONSE" | jq '.' 2>/dev/null || echo "$FILTERED_RESPONSE"
echo ""

# Test 4: Invalid request (missing query)
echo -e "${YELLOW}Test 4: Error handling - missing query${NC}"
echo "POST /api/search with empty body"
echo ""

ERROR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/search" \
  -H "Content-Type: application/json" \
  -H "auth_token: $AUTH_TOKEN" \
  -d '{}')

echo "$ERROR_RESPONSE" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE"
echo ""

# Test 5: Invalid topK
echo -e "${YELLOW}Test 5: Error handling - invalid topK${NC}"
echo "POST /api/search with topK=200 (max is 100)"
echo ""

TOPK_ERROR=$(curl -s -X POST "$BASE_URL/api/search" \
  -H "Content-Type: application/json" \
  -H "auth_token: $AUTH_TOKEN" \
  -d '{"query": "test", "topK": 200}')

echo "$TOPK_ERROR" | jq '.' 2>/dev/null || echo "$TOPK_ERROR"
echo ""

echo -e "${GREEN}======================================================"
echo "Testing Complete"
echo "======================================================${NC}"
echo ""
echo "Note: Tests may fail if:"
echo "  1. Server not running (npm run dev)"
echo "  2. Pinecone index is empty (run /api/upsert first)"
echo "  3. Environment variables not set (OPENAI_API_KEY, PINECONE_API_KEY)"
