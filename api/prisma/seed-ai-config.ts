import { PrismaClient, AITaskType, AIProviderType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAIConfig() {
  console.log('Seeding AI Task Config...');

  const defaultConfigs = [
    {
      taskType: AITaskType.VISION_PARSE,
      provider: AIProviderType.GEMINI,
      model: 'gemini-2.5-flash',
      temperature: 0.1,
      maxTokens: 4000,
      isActive: true,
    },
    {
      taskType: AITaskType.CONTENT_CLASSIFY,
      provider: AIProviderType.GEMINI,
      model: 'gemini-2.5-flash',
      temperature: 0.1,
      maxTokens: 4000,
      isActive: true,
    },
    {
      taskType: AITaskType.KNOWLEDGE_EXTRACTION,
      provider: AIProviderType.GEMINI,
      model: 'gemini-2.5-flash',
      temperature: 0.1,
      maxTokens: 4000,
      isActive: true,
    },
    {
      taskType: AITaskType.FLASHCARD_GENERATION,
      provider: AIProviderType.GEMINI,
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      maxTokens: 2000,
      isActive: true,
    },
    {
      taskType: AITaskType.QUESTION_GENERATION,
      provider: AIProviderType.GEMINI,
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 2000,
      isActive: true,
    },
    {
      taskType: AITaskType.EMBEDDING,
      provider: AIProviderType.GEMINI,
      model: 'text-embedding-004',
      temperature: 0,
      maxTokens: 0,
      isActive: true,
    },
    {
      taskType: AITaskType.EXAM_QUESTION_ANALYSIS,
      provider: AIProviderType.GEMINI,
      model: 'gemini-2.5-flash',
      temperature: 0.1,
      maxTokens: 4000,
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
