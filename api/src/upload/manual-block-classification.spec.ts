import { BadGatewayException } from '@nestjs/common';
import { parseManualBlockClassification } from './manual-block-classification';

describe('manual AI block classification', () => {
  it('keeps mixed text, table, and algorithm suggestions separate', () => {
    const result = parseManualBlockClassification(
      JSON.stringify({
        blocks: [
          { type: 'TEXT', content: 'Açıklama' },
          {
            type: 'TABLE',
            content: '| İlaç | Doz |\n| --- | --- |\n| A | 5 mg |',
            tableData: { headers: ['İlaç', 'Doz'], rows: [['A', '5 mg']] },
          },
          {
            type: 'ALGORITHM',
            content: '1. Kontrol et',
            algorithmData: { steps: [{ action: 'Kontrol et' }] },
          },
        ],
      }),
    );
    expect(result.map((block) => block.blockType)).toEqual([
      'TEXT',
      'TABLE',
      'ALGORITHM',
    ]);
    expect(result[1].tableData).toEqual({
      headers: ['İlaç', 'Doz'],
      rows: [['A', '5 mg']],
    });
  });

  it('rejects a table with mismatched cells before it is saved', () => {
    expect(() =>
      parseManualBlockClassification({
        blocks: [
          {
            type: 'TABLE',
            content: 'A | B',
            tableData: { headers: ['A', 'B'], rows: [['only one']] },
          },
        ],
      }),
    ).toThrow(BadGatewayException);
  });
});
