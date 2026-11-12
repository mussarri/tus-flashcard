import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

import { AdminModule } from './admin.module';
import { AIRouterService } from '../ai/ai-router.service';
import { OpenRouterProvider } from '../ai/providers/openrouter.provider';

describe('AdminModule AI dependencies', () => {
  it('resolves AIRouterService with OpenRouterProvider', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AdminModule,
      ],
    }).compile();

    expect(module.get(AIRouterService)).toBeInstanceOf(AIRouterService);
    expect(module.get(OpenRouterProvider)).toBeInstanceOf(OpenRouterProvider);

    await module.close();
  });
});
