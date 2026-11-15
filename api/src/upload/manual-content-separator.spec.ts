import { BadRequestException } from '@nestjs/common';
import { splitManualContents } from './manual-content-separator';

describe('manual content separator', () => {
  it('splits only on a standalone separator and keeps table rules', () => {
    expect(
      splitManualContents(
        'First\n| A | B |\n| --- | --- |\n---\nSecond',
        '---',
      ),
    ).toEqual(['First\n| A | B |\n| --- | --- |', 'Second']);
  });

  it('rejects an empty section rather than silently dropping it', () => {
    expect(() => splitManualContents('First\n---\n---\nSecond', '---')).toThrow(
      BadRequestException,
    );
  });
});
