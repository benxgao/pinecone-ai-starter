/**
 * Splits text into semantic chunks
 * Prioritizes markdown headers and paragraph breaks as split points
 *
 * @param text - Input text to split
 * @returns Promise<string[]> - Array of semantic text chunks
 */
export const splitterTextInModeSemantic = async (
  text: string,
): Promise<string[]> => {
  // Handle empty or whitespace-only input
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: string[] = [];

  // First, split by paragraph breaks (double newlines or more)
  // This regex handles multiple consecutive newlines with optional whitespace
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  for (const paragraph of paragraphs) {
    // For each paragraph, split by markdown headers
    const headerChunks = splitByHeaders(paragraph);
    chunks.push(...headerChunks);
  }

  return chunks;
};

/**
 * Helper function to split text by markdown headers
 * @param text - Text to split
 * @returns Array of chunks split by headers
 */
function splitByHeaders(text: string): string[] {
  const chunks: string[] = [];
  const lines = text.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if this line is a markdown header (starts with # followed by space)
    const isHeader = /^#{1,6}\s+/.test(trimmedLine);

    if (isHeader && currentChunk.trim()) {
      // Save current chunk and start new one with header
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      // Add line to current chunk
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  // Add final chunk if it exists
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
