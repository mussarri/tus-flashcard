import { KnowledgePointGeneratorService } from './knowledge-point-generator.service';

jest.mock('../ai/ai-router.service', () => ({ AIRouterService: class {} }));
jest.mock('@prisma/client', () => ({
  AITaskType: {
    CONTENT_CLASSIFY: 'CONTENT_CLASSIFY',
    KNOWLEDGE_EXTRACTION: 'KNOWLEDGE_EXTRACTION',
  },
}));

describe('TABLE knowledge point generation', () => {
  it('uses AI table classification and sends every real row and column to extraction', async () => {
    const rows = Array.from({ length: 25 }, (_, index) => [
      `item-${index}`,
      `a-${index}`,
      `b-${index}`,
      `c-${index}`,
      `d-${index}`,
    ]);
    const runTask = jest.fn().mockImplementation((task: string) =>
      task === 'CONTENT_CLASSIFY'
        ? { tableType: 'COMPARISON' }
        : {
            knowledgePoints: [
              {
                fact: 'Karşılaştırma bilgisi',
                priority: 8,
                examRelevance: 0.9,
                classificationConfidence: 0.9,
              },
            ],
          },
    );
    const service = new KnowledgePointGeneratorService({ runTask } as never);

    await service.generateFromApprovedContent({
      approvedContentId: 'approved-1',
      content: 'Büyük tablo',
      blockType: 'TABLE',
      tableData: { headers: ['Öğe', 'A', 'B', 'C', 'D'], rows },
      maxKnowledgePoints: 50,
    });

    const calls = runTask.mock.calls as Array<
      [string, { strategyHint?: string; content: string }]
    >;
    const extractionCalls = calls.filter(
      (call) => call[0] === 'KNOWLEDGE_EXTRACTION',
    );
    expect(calls[0][0]).toBe('CONTENT_CLASSIFY');
    expect(extractionCalls.length).toBeGreaterThan(1);
    expect(
      extractionCalls.every(
        (call) => call[1].strategyHint === 'TABLE_COMPARISON',
      ),
    ).toBe(true);
    expect(
      extractionCalls.flatMap(
        (call) => (JSON.parse(call[1].content) as { rows: string[][] }).rows,
      ),
    ).toEqual(rows);
    expect(
      (JSON.parse(extractionCalls[0][1].content) as { headers: string[] })
        .headers,
    ).toEqual(['Öğe', 'A', 'B', 'C', 'D']);
  });

  it('rejects an unknown AI table classification before extracting facts', async () => {
    const runTask = jest.fn().mockResolvedValue({ tableType: 'GUESS' });
    const service = new KnowledgePointGeneratorService({ runTask } as never);
    await expect(
      service.generateFromApprovedContent({
        approvedContentId: 'approved-2',
        content: 'A | B',
        blockType: 'TABLE',
        tableData: { headers: ['A', 'B'], rows: [['x', 'y']] },
      }),
    ).rejects.toThrow('unknown table type');
    expect(runTask).toHaveBeenCalledTimes(1);
  });

  it('keeps more than 50 distinct facts from separate table chunks', async () => {
    let extractionIndex = 0;
    const runTask = jest.fn().mockImplementation((task: string) => {
      if (task === 'CONTENT_CLASSIFY') return { tableType: 'DIRECT_FACT' };
      const chunk = extractionIndex++;
      return {
        knowledgePoints: Array.from({ length: 30 }, (_, index) => ({
          fact: `Parça ${chunk} bilgi ${index}`,
          priority: 8,
          examRelevance: 0.9,
          classificationConfidence: 0.9,
        })),
      };
    });
    const service = new KnowledgePointGeneratorService({ runTask } as never);
    const result = await service.generateFromApprovedContent({
      approvedContentId: 'approved-3',
      content: 'Büyük tablo',
      blockType: 'TABLE',
      tableData: {
        headers: ['A', 'B'],
        rows: Array.from({ length: 16 }, (_, index) => [
          `a${index}`,
          `b${index}`,
        ]),
      },
      maxKnowledgePoints: 50,
    });
    expect(extractionIndex).toBe(2);
    expect(result).toHaveLength(60);
  });

  it('samples middle rows when classifying a long table', async () => {
    const runTask = jest
      .fn()
      .mockImplementation((task: string) =>
        task === 'CONTENT_CLASSIFY'
          ? { tableType: 'COMPARISON' }
          : { knowledgePoints: [] },
      );
    const service = new KnowledgePointGeneratorService({ runTask } as never);
    await service.generateFromApprovedContent({
      approvedContentId: 'approved-4',
      content: 'Uzun tablo',
      blockType: 'TABLE',
      tableData: {
        headers: ['A'],
        rows: Array.from({ length: 100 }, (_, index) => [`row-${index}`]),
      },
    });
    const classificationCall = (
      runTask.mock.calls as Array<[string, { table: { rows: string[][] } }]>
    )[0];
    expect(
      classificationCall[1].table.rows.some((row) => row[0] === 'row-50'),
    ).toBe(true);
  });
});
