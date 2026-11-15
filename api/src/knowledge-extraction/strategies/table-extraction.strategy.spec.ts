import {
  chunkTable,
  inferTableFromText,
  parseTables,
} from './table-extraction.strategy';

describe('table preparation for AI extraction', () => {
  it('keeps all columns and empty cells when reading a Markdown table', () => {
    const table = inferTableFromText(
      '| Hastalık | A | B |\n| --- | --- | --- |\n| X |  | Pozitif |',
    );
    expect(table.headers).toEqual(['Hastalık', 'A', 'B']);
    expect(table.rows).toEqual([['X', '', 'Pozitif']]);
  });

  it('preserves escaped pipes and code spans inside Markdown cells', () => {
    const table = inferTableFromText(
      '| Başlık | Değer |\n| --- | --- |\n| A \\| B | `x|y` |',
    );
    expect(table.rows).toEqual([['A | B', '`x|y`']]);
  });

  it('rejects malformed Markdown rows instead of silently shifting columns', () => {
    expect(() =>
      inferTableFromText('| A | B |\n| --- | --- |\n| X | Y | Z |'),
    ).toThrow('rows do not match headers');
  });

  it('rejects structured rows whose keys do not match their headers', () => {
    expect(() =>
      parseTables({ headers: ['A', 'B'], rows: [{ X: 'x', Y: 'y' }] }, ''),
    ).toThrow('Invalid structured table data');
  });

  it('keeps every structured table and row across chunks', () => {
    const rows = Array.from({ length: 25 }, (_, index) => [
      `item-${index}`,
      `value-${index}`,
    ]);
    const tables = parseTables(
      [
        { headers: ['Öğe', 'Değer'], rows },
        { headers: ['Ek'], rows: [['son']] },
      ],
      'ignored',
    );
    expect(tables).toHaveLength(2);
    const chunks = chunkTable(tables[0]);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.flatMap((chunk) => chunk.rows)).toEqual(rows);
  });
});
