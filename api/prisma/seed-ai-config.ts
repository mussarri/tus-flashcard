import { PrismaClient, AITaskType, AIProviderType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAIConfig() {
  console.log('Seeding AI Task Config...');

  const defaultConfigs = [
    {
      taskType: AITaskType.VISION_PARSE,
      provider: AIProviderType.OPENROUTER,
      model: 'deepseek/deepseek-v4.1-flash-1017',
      temperature: 0.1,
      maxTokens: 4000,
      isActive: true,
    },
    {
      taskType: AITaskType.CONTENT_CLASSIFY,
      provider: AIProviderType.OPENROUTER,
      model: 'deepseek/deepseek-v4.1-flash-1017',
      temperature: 0.1,
      maxTokens: 4000,
      isActive: true,
    },
    {
      taskType: AITaskType.KNOWLEDGE_EXTRACTION,
      provider: AIProviderType.OPENROUTER,
      model: 'deepseek/deepseek-v4.1-flash-1017',
      temperature: 0.1,
      maxTokens: 4000,
      isActive: true,
    },
    {
      taskType: AITaskType.FLASHCARD_GENERATION,
      provider: AIProviderType.OPENROUTER,
      model: 'deepseek/deepseek-v4.1-flash-1017',
      temperature: 0.3,
      maxTokens: 2000,
      isActive: true,
    },
    {
      taskType: AITaskType.QUESTION_GENERATION,
      provider: AIProviderType.OPENROUTER,
      model: 'deepseek/deepseek-v4.1-flash-1017',
      temperature: 0.7,
      maxTokens: 2000,
      isActive: true,
    },
    {
      taskType: AITaskType.EMBEDDING,
      provider: AIProviderType.OPENROUTER,
      model: 'openai/text-embedding-3-small',
      temperature: 0,
      maxTokens: 0,
      isActive: true,
    },
    {
      taskType: AITaskType.EXAM_QUESTION_ANALYSIS,
      provider: AIProviderType.OPENROUTER,
      model: 'deepseek/deepseek-v4.1-flash-1017',
      temperature: 0.1,
      maxTokens: 4000,
      isActive: true,
    },
    {
      taskType: AITaskType.QUESTION_ANALYZE_AND_KP,
      provider: AIProviderType.OPENROUTER,
      model: 'deepseek/deepseek-v4.1-flash-1017',
      temperature: 0.1,
      maxTokens: 4000,
      isActive: true,
    },
    {
      taskType: AITaskType.KP_ATOMICITY_VALIDATE,
      provider: AIProviderType.OPENROUTER,
      model: 'deepseek/deepseek-v4.1-flash-1017',
      temperature: 0.1,
      maxTokens: 1500,
      isActive: true,
    },
    {
      taskType: AITaskType.KP_ATOMICITY_SPLIT,
      provider: AIProviderType.OPENROUTER,
      model: 'deepseek/deepseek-v4.1-flash-1017',
      temperature: 0.2,
      maxTokens: 2000,
      isActive: true,
    },
  ];

  for (const config of defaultConfigs) {
    await prisma.aITaskConfig.upsert({
      where: { taskType: config.taskType },
      update: config,
      create: config,
    });
    console.log(`✓ Seeded config for ${config.taskType}`);
  }

  console.log('AI Task Config seeding completed!');
}

seedAIConfig()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
