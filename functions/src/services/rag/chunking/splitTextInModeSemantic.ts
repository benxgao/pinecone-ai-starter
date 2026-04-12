/**
 * Semantic splitter with size-gated merging
 * Prioritizes markdown headers and paragraph breaks, then merges short chunks
 * Sample IN: text="# H1\nShort para.\n\n# H2\nAnother short para.", maxChunkSize=200
 *        OUT: ["# H1\nShort para.", "# H2\nAnother short para."]
 */
const MERGE_THRESHOLD = 0.8; // keep <1.0 to reserve tokenizer headroom

export const splitTextInModeSemantic = async (
  text: string,
  maxChunkSize = 10,
): Promise<string[]> => {
  if (!text || text.trim().length === 0) return [];

  // 1. split by paragraph breaks
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // 2. split each paragraph by headers
  const rawChunks: Array<{ text: string; paragraphIndex: number }> = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const chunks = splitByHeaders(para);
    for (const chunk of chunks) {
      rawChunks.push({ text: chunk, paragraphIndex: i });
    }
  }

  // 3. merge short chunks while under threshold (within same paragraph)
  const merged: string[] = [];
  let buffer = '';
  let bufferParagraph = -1;
  for (const { text: chunk, paragraphIndex } of rawChunks) {
    const candidate = buffer ? `${buffer}\n\n${chunk}` : chunk;
    // Only merge if: candidate fits AND from same paragraph
    if (
      candidate.length <= maxChunkSize * MERGE_THRESHOLD &&
      paragraphIndex === bufferParagraph
    ) {
      buffer = candidate;
    } else {
      if (buffer) merged.push(buffer);
      buffer = chunk;
      bufferParagraph = paragraphIndex;
    }
  }
  if (buffer) merged.push(buffer);

  return merged;
};

function splitByHeaders(text: string): string[] {
  const chunks: string[] = [];
  const lines = text.split('\n');
  let current = '';
  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line.trim()) && current.trim()) {
      chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
