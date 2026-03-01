import { TableExtractionStrategy } from './table-extraction.strategy';

describe('TableExtractionStrategy', () => {
  const strategy = new TableExtractionStrategy();

  it('extracts direct fact table with per-row relation', () => {
    const tableData = [
      {
        headers: ['Sinir', 'İnnervasyon'],
        rows: [
          ['n. musculocutaneus', 'm. biceps brachii'],
          ['n. radialis', 'm. triceps brachii'],
        ],
      },
    ];

    const result = strategy.extract('Sinir-kas tablosu', tableData);

    expect(result.context.tableType).toBe('DIRECT_FACT');
    expect(result.context.extractionMode).toBe('STANDARD');
    expect(result.candidates.length).toBe(2);
    expect(result.candidates[0].fact).toContain('n. musculocutaneus');
  });

  it('extracts comparison table (SIADH vs DI) with pattern + selective rows', () => {
    const tableData = [
      {
        headers: ['Özellik', 'SIADH', 'Diabetes Insipidus'],
        rows: [
          ['Serum Osmolalitesi', 'Düşük', 'Yüksek'],
          ['İdrar Osmolalitesi', 'Yüksek', 'Düşük'],
          ['ADH', 'Yüksek', 'Düşük'],
        ],
      },
    ];

    const result = strategy.extract('SIADH vs DI', tableData);

    expect(result.context.tableType).toBe('COMPARISON');
    expect(result.candidates.length).toBeLessThanOrEqual(18);
    expect(result.candidates[0].kind).toBe('PATTERN');
  });

  it('uses PATTERN_ONLY for large tables and obeys caps', () => {
    const rows = Array.from({ length: 25 }, (_, i) => [
      `satir-${i + 1}`,
      `deger-${i + 1}`,
    ]);

    const tableData = [
      {
        headers: ['Kolon1', 'Kolon2'],
        rows,
      },
    ];

    const result = strategy.extract('Büyük tablo', tableData);

    expect(result.context.extractionMode).toBe('PATTERN_ONLY');
    expect(result.candidates.length).toBeLessThanOrEqual(16);
    expect(result.candidates.every((c) => c.kind === 'PATTERN')).toBe(true);
  });
});
