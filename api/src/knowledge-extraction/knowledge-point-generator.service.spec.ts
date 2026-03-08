/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { KnowledgePointGeneratorService } from './knowledge-point-generator.service';

describe('KnowledgePointGeneratorService JSON parsing', () => {
  const service = new KnowledgePointGeneratorService({} as any);

  it('repairs common malformed JSON patterns from model output', () => {
    const raw = `
\`\`\`json
{
  "knowledgePoints": [
    {"fact":"A bilgisi","priority":7,"examRelevance":0.9,"classificationConfidence":0.8}
    {"fact":"B bilgisi","priority":6,"examRelevance":0.7,"classificationConfidence":0.7,},
  ],
}
\`\`\`
`;

    const parsed = (service as any).validateModelResponse(raw) as Array<{
      fact: string;
    }>;

    expect(parsed).toHaveLength(2);
    expect(parsed[0].fact).toBe('A bilgisi');
    expect(parsed[1].fact).toBe('B bilgisi');
  });

  it('throws when output is not recoverable JSON', () => {
    expect(() =>
      (service as any).validateModelResponse('not json at all'),
    ).toThrow();
  });
});
