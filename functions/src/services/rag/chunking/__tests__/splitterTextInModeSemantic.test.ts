import { splitterTextInModeSemantic } from '../splitterTextInModeSemantic';

describe('splitterTextInModeSemantic', () => {
  describe('Basic functionality', () => {
    it('handles empty string', async () => {
      const chunks = await splitterTextInModeSemantic('');
      expect(chunks).toEqual([]);
    });

    it('handles single line text', async () => {
      const text = 'This is a simple line of text.';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual(['This is a simple line of text.']);
    });

    it('preserves whitespace in content', async () => {
      const text = 'Text with   multiple   spaces';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual(['Text with   multiple   spaces']);
    });
  });

  describe('Markdown header splitting', () => {
    it('splits on markdown headers', async () => {
      const text = '# Header 1\nContent here\n## Header 2\nMore content';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual([
        '# Header 1\nContent here',
        '## Header 2\nMore content',
      ]);
    });

    it('handles headers at different levels', async () => {
      const text = '# H1\nContent 1\n## H2\nContent 2\n### H3\nContent 3';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual([
        '# H1\nContent 1',
        '## H2\nContent 2',
        '### H3\nContent 3',
      ]);
    });

    it('handles consecutive headers', async () => {
      const text = '# Header 1\n## Header 2\n### Header 3';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual(['# Header 1', '## Header 2', '### Header 3']);
    });

    it('handles headers with no content', async () => {
      const text = '# Header 1\n\n## Header 2\n\nContent';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual(['# Header 1', '## Header 2', 'Content']);
    });
  });

  describe('Paragraph splitting', () => {
    it('splits on double newlines (paragraph breaks)', async () => {
      const text = 'First paragraph.\n\nSecond paragraph.';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual(['First paragraph.', 'Second paragraph.']);
    });

    it('preserves single newlines within paragraphs', async () => {
      const text = 'Line 1\nLine 2\n\nLine 3\nLine 4';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual(['Line 1\nLine 2', 'Line 3\nLine 4']);
    });

    it('handles multiple consecutive blank lines', async () => {
      const text = 'Para 1\n\n\n\nPara 2';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual(['Para 1', 'Para 2']);
    });
  });

  describe('Mixed content handling', () => {
    it('handles headers followed by paragraphs', async () => {
      const text =
        '# Title\nParagraph 1\n\nParagraph 2\n## Section\nParagraph 3';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual([
        '# Title\nParagraph 1',
        'Paragraph 2',
        '## Section\nParagraph 3',
      ]);
    });

    it('handles complex markdown structure', async () => {
      const text = `# Main Title
Introduction paragraph.

## Section 1
Content for section 1.

### Subsection
More detailed content.

## Section 2
Final content.`;

      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual([
        '# Main Title\nIntroduction paragraph.',
        '## Section 1\nContent for section 1.',
        '### Subsection\nMore detailed content.',
        '## Section 2\nFinal content.',
      ]);
    });
  });

  describe('Edge cases', () => {
    it('handles text with only whitespace', async () => {
      const text = '   \n\n  \n  ';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual([]);
    });

    it('handles headers without space after hash', async () => {
      const text = '#Header\nContent';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual(['#Header\nContent']);
    });

    it('handles mixed whitespace (tabs and spaces)', async () => {
      const text = 'Para 1\n\t\n\t\nPara 2';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual(['Para 1', 'Para 2']);
    });

    it('preserves code blocks and special formatting', async () => {
      const text = '# Code Example\n```\ncode here\n```\n\n# Next Section';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual([
        '# Code Example\n```\ncode here\n```',
        '# Next Section',
      ]);
    });

    it('handles very long paragraphs', async () => {
      const longText = 'word '.repeat(1000) + '.\n\nShort paragraph.';
      const chunks = await splitterTextInModeSemantic(longText);
      expect(chunks.length).toBe(2);
      expect(chunks[0]).toContain('word word word');
      expect(chunks[1]).toBe('Short paragraph.');
    });

    it('handles single word paragraphs', async () => {
      const text = 'One\n\nTwo\n\nThree';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual(['One', 'Two', 'Three']);
    });
  });

  describe('Content preservation', () => {
    it('preserves original formatting within chunks', async () => {
      const text =
        '# Header\n  Indented line\n  Another indented line\n\nNew paragraph';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual([
        '# Header\n  Indented line\n  Another indented line',
        'New paragraph',
      ]);
    });

    it('preserves special characters', async () => {
      const text =
        '# Special chars: !@#$%^&*()\nContent with émojis 🚀 and symbols';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual([
        '# Special chars: !@#$%^&*()\nContent with émojis 🚀 and symbols',
      ]);
    });

    it('handles lists and bullet points', async () => {
      const text =
        '# List Section\n- Item 1\n- Item 2\n\n# Next Section\nContent';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual([
        '# List Section\n- Item 1\n- Item 2',
        '# Next Section\nContent',
      ]);
    });
  });

  describe('Performance considerations', () => {
    it('handles large documents efficiently', async () => {
      const largeText =
        '# Chapter 1\n' +
        'word '.repeat(5000) +
        '\n\n# Chapter 2\n' +
        'word '.repeat(5000);
      const start = Date.now();
      const chunks = await splitterTextInModeSemantic(largeText);
      const end = Date.now();

      expect(chunks.length).toBe(2);
      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('handles deeply nested headers', async () => {
      const text = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6\nContent';
      const chunks = await splitterTextInModeSemantic(text);
      expect(chunks).toEqual([
        '# H1',
        '## H2',
        '### H3',
        '#### H4',
        '##### H5',
        '###### H6\nContent',
      ]);
    });
  });
});
