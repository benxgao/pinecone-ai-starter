import * as R from 'ramda';

// Token estimation: ~4 characters per token (English average)
export const CHARS_PER_TOKEN = 4;
export function generateChunksInModeFixedSize(
  text: string,
  chunkSizeTokens: number = 512,
) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let charCount = 0;
  const chunkSizeChars = chunkSizeTokens * CHARS_PER_TOKEN;

  for (const word of words) {
    const wordWithSpace = currentChunk.length === 0 ? word : ` ${word}`;
    if (
      charCount + wordWithSpace.length > chunkSizeChars &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [word];
      charCount = word.length;
    } else {
      currentChunk.push(word);
      charCount += wordWithSpace.length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}


export function generateChunksInModeSlidingWindow(
  text: string,
  chunkSizeTokens: number = 512,
  overlapTokens: number = 100,
) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const chunks: string[] = [];
  const chunkSizeChars = chunkSizeTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;
  const stepChars = chunkSizeChars - overlapChars;

  let position = 0;

  while (position < words.length) {
    const endPosition = Math.min(position + chunkSizeTokens * 2, words.length); // Conservative estimate
    const chunk = words.slice(position, endPosition).join(' ');

    // Check actual character size and trim if needed
    if (chunk.length > chunkSizeChars) {
      const trimmedChunk = chunk.substring(0, chunkSizeChars);
      chunks.push(trimmedChunk);
      position += Math.max(1, Math.ceil(stepChars / CHARS_PER_TOKEN));
    } else {
      chunks.push(chunk);
      if (endPosition === words.length) break;
      position += Math.max(1, Math.ceil(stepChars / CHARS_PER_TOKEN));
    }
  }

  return chunks;
}


export function generateChunksInModeSemantic(text: string) {
  const lines = text.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const line of lines) {
    const isHeader = /^#+\s/.test(line.trim());
    const isBreak = line.trim().length === 0 && currentChunk.trim().length > 50;

    if ((isHeader || isBreak) && currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = isHeader ? line : '';
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
