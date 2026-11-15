import { BadGatewayException } from '@nestjs/common';
import { BlockType, Prisma } from '@prisma/client';

export interface ManualClassifiedBlock {
  blockType: BlockType;
  content: string;
  tableData?: Prisma.InputJsonValue;
  algorithmData?: Prisma.InputJsonValue;
}

export function parseManualBlockClassification(
  raw: unknown,
): ManualClassifiedBlock[] {
  let value: unknown = raw;
  try {
    if (typeof raw === 'string') {
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '');
      value = JSON.parse(cleaned) as unknown;
    }
  } catch {
    throw new BadGatewayException('AI returned invalid classification JSON');
  }

  const blocks = (value as { blocks?: unknown } | null)?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0 || blocks.length > 100) {
    throw new BadGatewayException('AI returned an invalid number of blocks');
  }

  return blocks.map((item: unknown) => {
    if (!item || typeof item !== 'object') {
      throw new BadGatewayException('AI returned an invalid block');
    }
    const block = item as Record<string, unknown>;
    const type = block.type;
    const content = block.content;
    if (
      !['TEXT', 'TABLE', 'ALGORITHM'].includes(String(type)) ||
      typeof content !== 'string' ||
      !content.trim()
    ) {
      throw new BadGatewayException(
        'AI returned an invalid block type or content',
      );
    }
    if (type === 'TABLE') {
      const table = block.tableData as {
        headers?: unknown;
        rows?: unknown;
      } | null;
      if (
        !table ||
        !Array.isArray(table.headers) ||
        !Array.isArray(table.rows) ||
        table.headers.length === 0 ||
        table.rows.length === 0 ||
        !table.headers.every((cell) => typeof cell === 'string') ||
        !table.rows.every(
          (row) =>
            Array.isArray(row) &&
            row.length === (table.headers as unknown[]).length &&
            row.every((cell) => typeof cell === 'string'),
        )
      ) {
        throw new BadGatewayException('AI returned an invalid table structure');
      }
    }
    if (
      type === 'ALGORITHM' &&
      (!block.algorithmData || typeof block.algorithmData !== 'object')
    ) {
      throw new BadGatewayException(
        'AI returned an invalid algorithm structure',
      );
    }
    return {
      blockType: type as BlockType,
      content: content.trim(),
      tableData:
        type === 'TABLE'
          ? (block.tableData as Prisma.InputJsonValue)
          : undefined,
      algorithmData:
        type === 'ALGORITHM'
          ? (block.algorithmData as Prisma.InputJsonValue)
          : undefined,
    };
  });
}
