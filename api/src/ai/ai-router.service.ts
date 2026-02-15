/* eslint-disable no-constant-condition */
import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AITaskType, VisionPayload, AIModelOptions, TokenUsage } from './types';
import { AIProvider } from './providers/ai-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { buildVisionPrompt } from './prompts/vision.prompt';
import { buildKnowledgeExtractionPrompt } from './prompts/knowledge.prompt';
import { buildFlashcardPrompt } from './prompts/flashcard-prompt-builder';
import { buildQuestionPrompt } from './prompts/question.prompt';
import { buildAnatomyExamQuestionAnalysisPrompt } from './prompts/exam-question-analysis-anatomy.prompt';
import { buildPharmacologyExamQuestionAnalysisPrompt } from './prompts/exam-question-analysis-pharmacology.prompt';
import { buildInternalMedicineExamQuestionAnalysisPrompt } from './prompts/exam-question-analysis-internal-medicine.prompt';
import { buildPathologyExamQuestionAnalysisPrompt } from './prompts/exam-question-analysis-pathology.prompt';
import { AIProviderType } from '@prisma/client';
import { PricingService } from './pricing.service';
import { PrerequisiteLearningService } from '../exam-question/prerequisite-learning.service';
import { buildFizyolojiExamQuestionAnalysisPrompt } from './prompts/exam-question-analysis-fizyoloji.prompt';

@Injectable()
export class AIRouterService {
  private readonly logger = new Logger(AIRouterService.name);
  private readonly providers: Map<AIProviderType, AIProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiProvider: OpenAIProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly pricingService: PricingService,
    @Inject(forwardRef(() => PrerequisiteLearningService))
    private readonly prerequisiteLearningService: PrerequisiteLearningService,
  ) {
    // Initialize provider registry
    this.providers = new Map();
    this.providers.set('OPENAI', openaiProvider);
    this.providers.set('GEMINI', geminiProvider);
  }

  /**
   * Run an AI task with the configured provider
   * @param taskType - The AI task type to run
   * @param payload - Task-specific payload (may include batchId, pageId, topicId, knowledgePointId)
   * @param overrideProvider - Optional provider override (for admin control)
   */
  async runTask(
    taskType: AITaskType,
    payload: Record<string, any>,
    overrideProvider?: AIProviderType,
  ): Promise<any> {
    try {
      this.logger.debug(`Running AI task: ${taskType}`);

      // Load active config for this task
      const config = await this.prisma.aITaskConfig.findUnique({
        where: { taskType },
      });

      if (!config || !config.isActive) {
        throw new NotFoundException(
          `No active AI config found for task: ${taskType}`,
        );
      }

      // Log config details for debugging
      this.logger.log(
        `AI Config for ${taskType}: provider=${config.provider}, model=${config.model}, isActive=${config.isActive}`,
      );

      // Use override provider if provided, otherwise use config provider
      const providerType = overrideProvider || config.provider;
      let effectiveModel = config.model;

      // Guard against provider-model mismatch
      const openaiModelPrefixes = ['gpt-', 'o1-', 'text-embedding-'];
      const geminiModelPrefixes = ['gemini-', 'text-embedding-'];

      // Additional check for deprecated Gemini models
      const deprecatedGeminiModels = [
        'gemini-1.5-flash-002',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-pro',
      ];
      if (
        providerType === 'GEMINI' &&
        deprecatedGeminiModels.includes(effectiveModel)
      ) {
        this.logger.warn(
          `Model ${effectiveModel} is deprecated. Auto-upgrading to gemini-2.5-flash.`,
        );
        effectiveModel = 'gemini-2.5-flash';
      }

      if (
        providerType === 'OPENAI' &&
        !openaiModelPrefixes.some((prefix) => effectiveModel.startsWith(prefix))
      ) {
        this.logger.warn(
          `Model ${effectiveModel} does not match provider OPENAI. Falling back to gpt-4o.`,
        );
        effectiveModel = 'gpt-4o';
      }
      if (
        providerType === 'GEMINI' &&
        !geminiModelPrefixes.some((prefix) => effectiveModel.startsWith(prefix))
      ) {
        this.logger.warn(
          `Model ${effectiveModel} does not match provider GEMINI. Falling back to gemini-2.5-flash.`,
        );
        effectiveModel = 'gemini-2.5-flash';
      }

      // Auto-heal mismatched configs when no override provider is used
      if (!overrideProvider && effectiveModel !== config.model) {
        await this.prisma.aITaskConfig.update({
          where: { taskType },
          data: { model: effectiveModel },
        });
        this.logger.warn(
          `Auto-corrected AI config model for ${taskType}: ${config.model} -> ${effectiveModel}`,
        );
      }

      // Get provider from registry
      const provider = this.providers.get(providerType);
      if (!provider) {
        throw new Error(`Provider ${providerType} not found in registry`);
      }

      this.logger.log(
        `Using provider: ${providerType}${overrideProvider ? ' (override)' : ''}, model: ${effectiveModel} for task: ${taskType}`,
      );

      // Build options from config
      const options: AIModelOptions = {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      };

      // Extract context IDs from payload (if present)
      const { batchId, pageId, topicId, knowledgePointId, ...taskPayload } =
        payload;

      // Route to appropriate method based on task type
      let result: number[] | string | object | null | undefined;
      let usage: TokenUsage | undefined;

      switch (taskType) {
        case AITaskType.VISION_PARSE:
        case AITaskType.CONTENT_CLASSIFY: {
          const visionResult = await this.runVisionTask(
            provider,
            taskPayload as { imageBase64: string; mimeType: string },
            options,
            effectiveModel,
          );
          result = visionResult.content;
          usage = visionResult.usage;
          break;
        }

        case AITaskType.KNOWLEDGE_EXTRACTION: {
          const knowledgeResult = await this.runKnowledgeExtractionTask(
            provider,
            taskPayload as {
              content: string;
              contentType?: string;
              blockType?: string;
              lesson?: string;
              topic?: string;
              subtopic?: string;
            },
            options,
            effectiveModel,
          );
          result = knowledgeResult.content;
          usage = knowledgeResult.usage;
          break;
        }

        case AITaskType.FLASHCARD_GENERATION: {
          const flashcardResult = await this.runFlashcardTaskInternal(
            provider,
            taskPayload as {
              statement: string;
              lesson?: string;
              topic?: string;
              subtopic?: string;
            },
            options,
            effectiveModel,
          );
          result = flashcardResult.content;
          usage = flashcardResult.usage;
          break;
        }

        case AITaskType.QUESTION_GENERATION: {
          const questionResult = await this.runQuestionTask(
            provider,
            taskPayload as {
              statement: string;
              lesson?: string;
              topic?: string;
              subtopic?: string;
              attempt?: number;
            },
            options,
            effectiveModel,
          );
          result = questionResult.content;
          usage = questionResult.usage;
          break;
        }

        case AITaskType.EXAM_QUESTION_ANALYSIS: {
          const examAnalysisResult = await this.runExamQuestionAnalysisTask(
            provider,
            taskPayload as {
              question: string;
              options: Record<string, string>;
              correctAnswer: string;
              explanation?: string;
              year?: number;
              examType?: string;
              lesson: string;
              topic?: string;
              prerequiseiteContext?: string[];
            },
            options,
            effectiveModel,
          );
          result = examAnalysisResult.content;
          usage = examAnalysisResult.usage;
          break;
        }

        case AITaskType.EMBEDDING: {
          result = await this.runEmbeddingTask(
            provider,
            taskPayload as { text: string },
            effectiveModel,
          );
          // Embeddings don't return token usage in the same format
          break;
        }

        default:
          throw new Error(`Unknown task type: ${taskType as string}`);
      }

      // Log token usage (non-blocking)
      if (usage && taskType !== AITaskType.EMBEDDING) {
        this.logTokenUsage(
          taskType,
          providerType,
          effectiveModel,
          usage,
          batchId,
          pageId,
          topicId,
          knowledgePointId,
        ).catch((error) => {
          // Log error but don't block the main task
          this.logger.error(
            `Failed to log token usage: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        });
      }

      return result;
    } catch (error) {
      this.logger.error(
        `AI task failed: ${taskType}, provider: ${payload?.provider || 'unknown'}, error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Log token usage to database (non-blocking)
   */
  private async logTokenUsage(
    taskType: AITaskType,
    provider: AIProviderType,
    model: string,
    usage: TokenUsage,
    batchId?: string,
    pageId?: string,
    topicId?: string,
    knowledgePointId?: string,
  ): Promise<void> {
    // Calculate cost
    const costUSD = this.pricingService.calculateCost(
      provider,
      model,
      usage.inputTokens,
      usage.outputTokens,
    );

    // Persist to database
    await this.prisma.aITokenUsage.create({
      data: {
        taskType,
        provider,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        costUSD,
        batchId: batchId || null,
        pageId: pageId || null,
        topicId: topicId || null,
        knowledgePointId: knowledgePointId || null,
      },
    });

    this.logger.debug(
      `Logged token usage: ${taskType}, ${provider}/${model}, tokens: ${usage.totalTokens}, cost: ${costUSD ? `$${costUSD.toFixed(6)}` : 'N/A'}`,
    );
  }

  /**
   * Run vision task (VISION_PARSE, CONTENT_CLASSIFY)
   */
  private async runVisionTask(
    provider: AIProvider,
    payload: {
      imageBase64: string;
      mimeType: string;
    },
    options: AIModelOptions,
    model: string,
  ): Promise<{ content: string; usage?: TokenUsage }> {
    const { systemPrompt, userPrompt } = buildVisionPrompt(payload);

    const visionPayload: VisionPayload = {
      imageBase64: payload.imageBase64,
      mimeType: payload.mimeType,
      systemPrompt,
      userPrompt,
    };

    // Add response format for JSON
    const visionOptions = {
      ...options,
      responseFormat: 'json_object' as const,
    };

    const result = await provider.runVision(
      {
        ...visionPayload,
        options: visionOptions,
      },
      model,
    );

    return result;
  }

  /**
   * Run knowledge extraction task
   */
  private async runKnowledgeExtractionTask(
    provider: AIProvider,
    payload: {
      content: string;
      contentType?: string;
      blockType?: string;
      lesson?: string;
      topic?: string;
      subtopic?: string;
    },
    options: AIModelOptions,
    model: string,
  ): Promise<{ content: string; usage?: TokenUsage }> {
    const { systemPrompt, userPrompt } =
      buildKnowledgeExtractionPrompt(payload);

    const textOptions = {
      ...options,
      responseFormat: 'json_object' as const,
    };

    return await provider.runText(systemPrompt, userPrompt, model, textOptions);
  }

  /**
   * Run flashcard generation task (internal - legacy)
   */
  private async runFlashcardTaskInternal(
    provider: AIProvider,
    payload: {
      statement: string;
      lesson?: string;
      topic?: string;
      subtopic?: string;
    },
    options: AIModelOptions,
    model: string,
  ): Promise<{ content: string; usage?: TokenUsage }> {
    // Legacy: use default target types if not provided
    const payloadWithTypes = {
      ...payload,
      targetTypes: [
        'FUNCTIONAL_ANATOMY',
        'CLINICAL_CORRELATION',
        'HIGH_YIELD_DISTINCTION',
      ],
    };
    const { systemPrompt, userPrompt } = buildFlashcardPrompt(payloadWithTypes);

    const textOptions = {
      ...options,
      responseFormat: 'json_object' as const,
    };

    return await provider.runText(systemPrompt, userPrompt, model, textOptions);
  }

  /**
   * Run flashcard generation task (supports multiple lessons)
   * Routes to lesson-specific prompts (Anatomi, Fizyoloji, etc.)
   */
  async runFlashcardTask(payload: {
    statement: string;
    targetTypes: string[];
    lesson?: string;
    topic?: string;
    subtopic?: string;
  }): Promise<{ content: string; usage?: TokenUsage }> {
    const { systemPrompt, userPrompt } = buildFlashcardPrompt(payload);

    const taskConfig = await this.prisma.aITaskConfig.findUnique({
      where: { taskType: AITaskType.FLASHCARD_GENERATION },
    });

    if (!taskConfig) {
      throw new Error('AI task config not found for FLASHCARD_GENERATION');
    }

    const provider = this.providers.get(taskConfig.provider);
    if (!provider) {
      throw new Error(`Provider ${taskConfig.provider} not found`);
    }

    const model = taskConfig.model;

    const textOptions = {
      temperature: taskConfig.temperature ?? 0.7,
      maxTokens: taskConfig.maxTokens ?? 2000,
      responseFormat: 'json_object' as const,
    };

    return await provider.runText(systemPrompt, userPrompt, model, textOptions);
  }

  private async runQuestionTask(
    provider: AIProvider,
    payload: {
      statement: string;
      lesson?: string;
      topic?: string;
      subtopic?: string;
      attempt?: number;
    },
    options: AIModelOptions,
    model: string,
  ): Promise<{ content: string; usage?: TokenUsage }> {
    const { systemPrompt, userPrompt } = buildQuestionPrompt(payload);

    const textOptions = {
      ...options,
      responseFormat: 'json_object' as const,
      temperature: options.temperature ?? 0.7, // Higher temperature for variety
    };

    return await provider.runText(systemPrompt, userPrompt, model, textOptions);
  }

  /**
   * Run exam question analysis task
   */
  private async runExamQuestionAnalysisTask(
    provider: AIProvider,
    payload: {
      question: string;
      options: Record<string, string>;
      correctAnswer: string;
      explanation?: string;
      year?: number;
      examType?: string;
      lesson: string; // Required: lesson name to select lesson-specific prompt
      topic?: string; // Optional: topic for prerequisite context injection
    },
    options: AIModelOptions,
    model: string,
  ): Promise<{ content: string; usage?: TokenUsage }> {
    // Lesson is required - each lesson must have its own prompt
    if (!payload.lesson) {
      throw new NotFoundException(
        'Lesson is required for exam question analysis. Please select a lesson before analyzing.',
      );
    }

    const lessonLower = payload.lesson.toLowerCase();
    let systemPrompt: string;
    let userPrompt: string;
    let prerequisiteContext: string[] | undefined;
    if (payload.topic) {
      try {
        prerequisiteContext =
          await this.prerequisiteLearningService.getPrerequisiteContextForTopic(
            payload.topic,
          );
        this.logger.debug(
          `Fetched ${prerequisiteContext.length} prerequisite contexts for topic: ${payload.topic}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to fetch prerequisite context for topic ${payload.topic}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Continue without prerequisite context
      }
    }

    // Select lesson-specific prompt based on lesson name
    if (lessonLower === 'anatomi') {
      // Fetch prerequisite context for anatomy questions if topic is available
      const result = buildAnatomyExamQuestionAnalysisPrompt({
        ...payload,
        prerequisiteContext,
      });
      systemPrompt = result.systemPrompt;
      userPrompt = result.userPrompt;
    } else if (lessonLower === 'farmakoloji') {
      const result = buildPharmacologyExamQuestionAnalysisPrompt(payload);
      systemPrompt = result.systemPrompt;
      userPrompt = result.userPrompt;
    } else if (lessonLower === 'fizyoloji') {
      const result = buildFizyolojiExamQuestionAnalysisPrompt({
        ...payload,
        prerequisiteContext,
      });
      systemPrompt = result.systemPrompt;
      userPrompt = result.userPrompt;
    } else if (lessonLower === 'dahiliye') {
      const result = buildInternalMedicineExamQuestionAnalysisPrompt(payload);
      systemPrompt = result.systemPrompt;
      userPrompt = result.userPrompt;
    } else if (lessonLower === 'patoloji') {
      const result = buildPathologyExamQuestionAnalysisPrompt(payload);
      systemPrompt = result.systemPrompt;
      userPrompt = result.userPrompt;
    } else {
      // Unknown lesson - throw error
      throw new NotFoundException(
        `No analysis prompt found for lesson: ${payload.lesson}. Supported lessons: Anatomi, Farmakoloji, Dahiliye, Patoloji.`,
      );
    }

    const textOptions = {
      ...options,
      responseFormat: 'json_object' as const,
    };

    const result = await provider.runText(
      systemPrompt,
      userPrompt,
      model,
      textOptions,
    );
    return result;
  }

  /**
   * Run embedding task
   */
  private async runEmbeddingTask(
    provider: AIProvider,
    payload: { text: string },
    model: string,
  ): Promise<number[]> {
    try {
      return await provider.runEmbedding(payload.text, model);
    } catch (error) {
      this.logger.error(
        `Embedding task failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
