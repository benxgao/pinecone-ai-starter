import {
  generateChunksInModeFixedSize,
  generateChunksInModeSlidingWindow,
  generateChunksInModeSemantic
} from '../getChunks';

describe('generateChunksInModeFixedSize', () => {
  it('splits short text into one chunk', () => {
    const text = 'Hello world';
    const chunks = generateChunksInModeFixedSize(text, 10); // 10 tokens ~ 40 chars
    expect(chunks).toEqual(['Hello world']);
  });

  it('splits long text into multiple chunks respecting token limit', () => {
    const text = 'word '.repeat(300); // ~300 tokens
    const chunks = generateChunksInModeFixedSize(text, 100); // 100 tokens ~ 400 chars
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should not exceed 400 characters
    chunks.forEach(chunk => expect(chunk.length).toBeLessThanOrEqual(400));
  });

  it('handles empty string', () => {
    const chunks = generateChunksInModeFixedSize('');
    expect(chunks).toEqual([]);
  });

  it('handles text with extra spaces', () => {
    const text = '  Hello    world   ';
    const chunks = generateChunksInModeFixedSize(text, 10);
    expect(chunks).toEqual(['Hello world']);
  });

  it('preserves word boundaries', () => {
    const text = 'Hello world from TypeScript';
    const chunks = generateChunksInModeFixedSize(text, 5); // 5 tokens ~ 20 chars
    // Should split without breaking words
    expect(chunks).toEqual(['Hello world from', 'TypeScript']);
  });
});

describe('generateChunksInModeSlidingWindow', () => {
  it('returns one chunk for short text', () => {
    const text = 'Short text';
    const chunks = generateChunksInModeSlidingWindow(text, 10, 2);
    expect(chunks).toEqual(['Short text']);
  });

  it('creates overlapping chunks for longer text', () => {
    const text = 'word '.repeat(100); // ~100 tokens
    const chunks = generateChunksInModeSlidingWindow(text, 20, 5); // 20 tokens, 5 overlap
    expect(chunks.length).toBeGreaterThan(1);
    // Adjacent chunks should share some words
    const first = chunks[0];
    const second = chunks[1];
    const overlap = first.split(' ').slice(-5).join(' ');
    expect(second).toContain(overlap);
  });

  it('handles empty string', () => {
    const chunks = generateChunksInModeSlidingWindow('');
    expect(chunks).toEqual([]);
  });

  it('respects chunk size limit', () => {
    const text = 'a'.repeat(1000); // 1000 chars ~ 250 tokens
    const chunks = generateChunksInModeSlidingWindow(text, 50, 10); // 50 tokens ~ 200 chars
    chunks.forEach(chunk => expect(chunk.length).toBeLessThanOrEqual(200));
  });

  it('uses default overlap when not provided', () => {
    const text = 'word '.repeat(50);
    const chunks = generateChunksInModeSlidingWindow(text, 20); // default overlap 100 tokens
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});

describe('generateChunksInModeSemantic', () => {
  it('splits on markdown headers', () => {
    const text = '# Header 1\nContent here\n## Header 2\nMore content';
    const chunks = generateChunksInModeSemantic(text);
    expect(chunks).toEqual(['# Header 1\nContent here', '## Header 2\nMore content']);
  });

  it('splits on blank lines when chunk is long enough', () => {
    const text = 'First paragraph with enough characters to trigger split.\n\nSecond paragraph here.';
    const chunks = generateChunksInModeSemantic(text);
    expect(chunks).toEqual(['First paragraph with enough characters to trigger split.', 'Second paragraph here.']);
  });

  it('does not split on blank lines for short chunks', () => {
    const text = 'Short\n\nText';
    const chunks = generateChunksInModeSemantic(text);
    expect(chunks).toEqual(['Short\n\nText']);
  });

  it('handles empty string', () => {
    const chunks = generateChunksInModeSemantic('');
    expect(chunks).toEqual([]);
  });

  it('handles text with no headers or breaks', () => {
    const text = 'Just a single line of text.';
    const chunks = generateChunksInModeSemantic(text);
    expect(chunks).toEqual(['Just a single line of text.']);
  });

  xit('trims whitespace from chunks', () => {
    const text = '# Header\n  \n  Content with spaces  \n  ';
    const chunks = generateChunksInModeSemantic(text);
    expect(chunks).toEqual(['# Header', 'Content with spaces']);
  });
});
