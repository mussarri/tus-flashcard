import {
  normalizeText,
  splitByLines,
  splitByBullets,
  splitByParagraphs,
  splitAuto,
  splitText,
} from '../src/upload/text-split.util';

describe('normalizeText', () => {
  it('trims leading/trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('converts CRLF to LF', () => {
    expect(normalizeText('a\r\nb')).toBe('a\nb');
  });

  it('collapses 3+ blank lines to 2', () => {
    const input = 'a\n\n\n\nb';
    expect(normalizeText(input)).toBe('a\n\nb');
  });
});

describe('splitByLines', () => {
  it('splits on newline and filters empty lines', () => {
    const result = splitByLines('line1\nline2\n\nline3');
    expect(result).toEqual(['line1', 'line2', 'line3']);
  });

  it('trims each line', () => {
    const result = splitByLines('  a  \n  b  ');
    expect(result).toEqual(['a', 'b']);
  });

  it('returns empty array for blank text', () => {
    expect(splitByLines('   \n  \n  ')).toEqual([]);
  });
});

describe('splitByBullets', () => {
  it('splits on dash bullets', () => {
    const text = '- First item\n- Second item\n- Third item';
    const result = splitByBullets(text);
    expect(result).toEqual(['First item', 'Second item', 'Third item']);
  });

  it('splits on asterisk bullets', () => {
    const text = '* A\n* B';
    expect(splitByBullets(text)).toEqual(['A', 'B']);
  });

  it('splits on • bullets', () => {
    const text = '• X\n• Y';
    expect(splitByBullets(text)).toEqual(['X', 'Y']);
  });

  it('splits on numbered list with dot', () => {
    const text = '1. First\n2. Second\n3. Third';
    expect(splitByBullets(text)).toEqual(['First', 'Second', 'Third']);
  });

  it('splits on numbered list with parenthesis', () => {
    const text = '1) Alpha\n2) Beta';
    expect(splitByBullets(text)).toEqual(['Alpha', 'Beta']);
  });

  it('joins continuation lines to previous bullet', () => {
    const text = '- Item one\n  Continued here\n- Item two';
    const result = splitByBullets(text);
    expect(result[0]).toContain('Item one');
    expect(result[0]).toContain('Continued here');
    expect(result[1]).toBe('Item two');
  });

  it('falls back to splitByLines when no bullets found', () => {
    const text = 'line a\nline b\nline c';
    expect(splitByBullets(text)).toEqual(['line a', 'line b', 'line c']);
  });

  it('strips the bullet marker character', () => {
    const text = '- Clean text';
    const result = splitByBullets(text);
    expect(result[0]).toBe('Clean text');
    expect(result[0]).not.toMatch(/^[-*•]/);
  });
});

describe('splitByParagraphs', () => {
  it('splits on double newlines', () => {
    const text = 'Paragraph one.\n\nParagraph two.';
    const result = splitByParagraphs(text);
    expect(result).toEqual(['Paragraph one.', 'Paragraph two.']);
  });

  it('collapses internal newlines to spaces', () => {
    const text = 'Line one\nLine two\n\nLine three\nLine four';
    const result = splitByParagraphs(text);
    expect(result[0]).toBe('Line one Line two');
    expect(result[1]).toBe('Line three Line four');
  });

  it('filters empty paragraphs', () => {
    const text = 'Para one\n\n\n\nPara two';
    const result = splitByParagraphs(text);
    expect(result).toHaveLength(2);
  });
});

describe('splitAuto', () => {
  it('chooses BULLETS when >30% lines are bullets', () => {
    const text = '- Alpha\n- Beta\n- Gamma\nnot a bullet';
    const result = splitAuto(text);
    // 3 bullet lines out of 4 = 75%
    expect(result).toContain('Alpha');
    expect(result).toContain('Beta');
  });

  it('chooses PARAGRAPHS when no bullets but blank-line breaks exist', () => {
    const text = 'Para one with details.\n\nPara two with more details.';
    const result = splitAuto(text);
    expect(result).toEqual([
      'Para one with details.',
      'Para two with more details.',
    ]);
  });

  it('falls back to LINES when no bullets and no blank lines', () => {
    const text = 'Line A\nLine B\nLine C';
    const result = splitAuto(text);
    expect(result).toEqual(['Line A', 'Line B', 'Line C']);
  });
});

describe('splitText', () => {
  const text = '- Item 1\n- Item 2';

  it.each([
    ['LINES' as const, ['- Item 1', '- Item 2']],
    ['BULLETS' as const, ['Item 1', 'Item 2']],
  ])('strategy=%s returns expected output', (strategy, expected) => {
    expect(splitText(text, strategy)).toEqual(expected);
  });

  it('AUTO dispatches correctly', () => {
    const bulletText = '- A\n- B\n- C';
    expect(splitText(bulletText, 'AUTO')).toEqual(['A', 'B', 'C']);
  });

  it('PARAGRAPHS splits correctly', () => {
    const paraText = 'P1\n\nP2\n\nP3';
    expect(splitText(paraText, 'PARAGRAPHS')).toEqual(['P1', 'P2', 'P3']);
  });
});
