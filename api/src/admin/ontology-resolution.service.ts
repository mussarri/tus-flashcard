import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ListUnresolvedTopicsDto,
  ResolveTopicDto,
  UnresolvedTopicSignalDto,
  ResolveTopicResponseDto,
  TopicResolutionAction,
  SubtopicResolutionAction,
} from './dto/ontology-resolution.dto';

/**
 * Service for managing Topic/Subtopic resolution from AI-generated suggestions
 *
 * CRITICAL DESIGN PRINCIPLES:
 * 1. AI analysis NEVER auto-creates Topics or Subtopics
 * 2. ALL ontology mutations are admin-controlled via this service
 * 3. Resolution operations MUST be transactional
 * 4. All admin actions MUST be logged for audit trail
 * 5. Ontology changes affect analytics, prerequisites, and flashcard generation
 */
@Injectable()
export class OntologyResolutionService {
  private readonly logger = new Logger(OntologyResolutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all unresolved topic/subtopic signals from AI analysis
   * Groups by (lesson, unmatchedTopic, unmatchedSubtopic) with frequency counts
   *
   * Why this exists: AI analysis produces text suggestions that don't match
   * our curated ontology. Admins need to see these grouped to resolve efficiently.
   */
  async listUnresolvedTopics(
    dto: ListUnresolvedTopicsDto,
  ): Promise<UnresolvedTopicSignalDto[]> {
    this.logger.log(
      `Fetching unresolved topics${dto.lessonId ? ` for lesson ${dto.lessonId}` : ''}`,
    );

    const where: {
      lessonId?: string;
      OR: Array<
        { unmatchedTopic: { not: null } } | { unmatchedSubtopic: { not: null } }
      >;
    } = {
      OR: [
        { unmatchedTopic: { not: null } },
        { unmatchedSubtopic: { not: null } },
      ],
    };

    if (dto.lessonId) {
      where.lessonId = dto.lessonId;
    }

    // Fetch all questions with unmatched topics/subtopics
    const questions = await this.prisma.examQuestion.findMany({
      where,
      select: {
        id: true,
        lessonId: true,
        unmatchedTopic: true,
        unmatchedSubtopic: true,
        topic: { select: { name: true } },
        subtopic: { select: { name: true } },
        lesson: {
          select: {
            name: true,
          },
        },
      },
    });

    // Group by (lessonId, unmatchedTopic, unmatchedSubtopic)
    const groupMap = new Map<
      string,
      {
        lesson: string;
        lessonId: string;
        unmatchedTopic: string | null;
        unmatchedSubtopic: string | null;
        questionIds: string[];
      }
    >();

    for (const q of questions) {
      const key = `${q.lessonId}|${q.unmatchedTopic || ''}|${q.unmatchedSubtopic || ''}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          lesson: q.lesson?.name || 'Unknown',
          lessonId: q.lessonId || '',
          unmatchedTopic: q.unmatchedTopic,
          unmatchedSubtopic: q.unmatchedSubtopic,
          questionIds: [],
        });
      }

      groupMap.get(key)!.questionIds.push(q.id);
    }

    // Convert to response DTOs
    const signals: UnresolvedTopicSignalDto[] = Array.from(
      groupMap.values(),
    ).map((group) => ({
      lesson: group.lesson,
      lessonId: group.lessonId,
      unmatchedTopic: group.unmatchedTopic,
      unmatchedSubtopic: group.unmatchedSubtopic,
      frequency: group.questionIds.length,
      exampleQuestionIds: group.questionIds.slice(0, 3), // First 3 as examples
    }));

    // Filter by minimum occurrences
    const minOccurrences = dto.minOccurrences || 1;
    const filtered = signals.filter((s) => s.frequency >= minOccurrences);

    // Sort by frequency (highest first)
    filtered.sort((a, b) => b.frequency - a.frequency);

    this.logger.log(`Found ${filtered.length} unresolved topic signals`);

    return filtered;
  }

  /**
   * Resolve a topic/subtopic signal by mapping or creating ontology entities
   *
   * CRITICAL: This is the ONLY way topics/subtopics are created from AI suggestions
   * All operations run in a transaction to ensure atomicity
   * All actions are logged for audit trail
   *
   * @param dto Resolution instructions from admin
   * @param adminUserId ID of admin performing the action
   */
  async resolveTopic(
    dto: ResolveTopicDto,
    adminUserId: string,
  ): Promise<ResolveTopicResponseDto> {
    this.logger.log(
      `Resolving topic: ${dto.unmatchedTopic || 'N/A'}, subtopic: ${dto.unmatchedSubtopic || 'N/A'}`,
    );

    // Validate: must have at least one action
    if (!dto.topicAction && !dto.subtopicAction) {
      throw new BadRequestException(
        'Must specify at least topicAction or subtopicAction',
      );
    }

    // Validate: action and corresponding data must match
    if (
      dto.topicAction === TopicResolutionAction.MAP_EXISTING &&
      !dto.mapToExistingTopicId
    ) {
      throw new BadRequestException(
        'mapToExistingTopicId required for MAP_EXISTING action',
      );
    }

    if (
      dto.topicAction === TopicResolutionAction.CREATE_NEW &&
      !dto.createNewTopic
    ) {
      throw new BadRequestException(
        'createNewTopic required for CREATE_NEW action',
      );
    }

    if (
      dto.subtopicAction === SubtopicResolutionAction.MAP_EXISTING &&
      !dto.mapToExistingSubtopicId
    ) {
      throw new BadRequestException(
        'mapToExistingSubtopicId required for subtopic MAP_EXISTING action',
      );
    }

    if (
      dto.subtopicAction === SubtopicResolutionAction.CREATE_NEW &&
      !dto.createNewSubtopic
    ) {
      throw new BadRequestException(
        'createNewSubtopic required for subtopic CREATE_NEW action',
      );
    }

    // Execute resolution in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      let resolvedTopicId: string | null = null;
      let resolvedTopicName: string | null = null;
      let resolvedSubtopicId: string | null = null;
      let resolvedSubtopicName: string | null = null;

      /* =========================
       * STEP 1: RESOLVE TOPIC
       * ========================= */
      if (dto.topicAction) {
        if (dto.topicAction === TopicResolutionAction.MAP_EXISTING) {
          // Validate existing topic
          const existingTopic = await tx.topic.findUnique({
            where: { id: dto.mapToExistingTopicId! },
          });

          if (!existingTopic) {
            throw new NotFoundException(
              `Topic not found: ${dto.mapToExistingTopicId}`,
            );
          }

          // Validate lesson match
          if (existingTopic.lessonId !== dto.lessonId) {
            throw new BadRequestException(
              `Topic ${existingTopic.name} does not belong to the specified lesson`,
            );
          }

          // Validate topic is not MERGED or ARCHIVED
          if (existingTopic.status === 'MERGED') {
            throw new BadRequestException(
              `Cannot map to MERGED topic: ${existingTopic.name}. Use the target topic instead.`,
            );
          }

          if (existingTopic.status === 'ARCHIVED') {
            throw new BadRequestException(
              `Cannot map to ARCHIVED topic: ${existingTopic.name}`,
            );
          }

          resolvedTopicId = existingTopic.id;
          resolvedTopicName = existingTopic.name;

          this.logger.log(
            `Mapping to existing topic: ${existingTopic.name} (${existingTopic.id})`,
          );
        } else if (dto.topicAction === TopicResolutionAction.CREATE_NEW) {
          // CRITICAL: This is the ONLY place where topics are created from AI suggestions
          // Admin has explicitly chosen to create a new topic
          const newTopicData = dto.createNewTopic!;

          // Validate lesson exists
          const lesson = await tx.lesson.findUnique({
            where: { id: newTopicData.lessonId },
          });

          if (!lesson) {
            throw new NotFoundException(
              `Lesson not found: ${newTopicData.lessonId}`,
            );
          }

          // Check for duplicates
          const existingDuplicate = await tx.topic.findFirst({
            where: {
              name: newTopicData.name,
              lessonId: newTopicData.lessonId,
            },
          });

          if (existingDuplicate) {
            throw new BadRequestException(
              `Topic "${newTopicData.name}" already exists in lesson "${lesson.name}"`,
            );
          }

          // Create new topic
          const newTopic = await tx.topic.create({
            data: {
              name: newTopicData.name,
              displayName: newTopicData.displayName || newTopicData.name,
              description:
                newTopicData.description ||
                `Created from AI suggestion: ${dto.unmatchedTopic}`,
              lessonId: newTopicData.lessonId,
              status: 'ACTIVE',
            },
          });

          resolvedTopicId = newTopic.id;
          resolvedTopicName = newTopic.name;

          this.logger.log(
            `Created new topic: ${newTopic.name} (${newTopic.id})`,
          );
        } else if (dto.topicAction === TopicResolutionAction.IGNORE) {
          // Admin has chosen to ignore this suggestion
          this.logger.log(
            `Ignoring topic suggestion: ${dto.unmatchedTopic || 'N/A'}`,
          );
        }
      }

      /* =========================
       * STEP 2: RESOLVE SUBTOPIC
       * ========================= */
      if (dto.subtopicAction) {
        if (dto.subtopicAction === SubtopicResolutionAction.MAP_EXISTING) {
          const existingSubtopic = await tx.subtopic.findUnique({
            where: { id: dto.mapToExistingSubtopicId! },
            include: { topic: true },
          });

          if (!existingSubtopic) {
            throw new NotFoundException(
              `Subtopic not found: ${dto.mapToExistingSubtopicId}`,
            );
          }

          // If topic was resolved, validate subtopic belongs to that topic
          if (resolvedTopicId && existingSubtopic.topicId !== resolvedTopicId) {
            throw new BadRequestException(
              `Subtopic ${existingSubtopic.name} does not belong to the resolved topic`,
            );
          }

          resolvedSubtopicId = existingSubtopic.id;
          resolvedSubtopicName = existingSubtopic.name;

          this.logger.log(
            `Mapping to existing subtopic: ${existingSubtopic.name} (${existingSubtopic.id})`,
          );
        } else if (dto.subtopicAction === SubtopicResolutionAction.CREATE_NEW) {
          const newSubtopicData = dto.createNewSubtopic!;

          // Validate topic exists
          const topic = await tx.topic.findUnique({
            where: { id: newSubtopicData.topicId },
          });

          if (!topic) {
            throw new NotFoundException(
              `Topic not found: ${newSubtopicData.topicId}`,
            );
          }

          // If topic was resolved in this transaction, use that instead
          const targetTopicId = resolvedTopicId || newSubtopicData.topicId;

          // Check for duplicates
          const existingDuplicate = await tx.subtopic.findFirst({
            where: {
              name: newSubtopicData.name,
              topicId: targetTopicId,
            },
          });

          if (existingDuplicate) {
            throw new BadRequestException(
              `Subtopic "${newSubtopicData.name}" already exists in topic "${topic.name}"`,
            );
          }

          // Create new subtopic
          const newSubtopic = await tx.subtopic.create({
            data: {
              name: newSubtopicData.name,
              displayName: newSubtopicData.displayName || newSubtopicData.name,
              description:
                newSubtopicData.description ||
                `Created from AI suggestion: ${dto.unmatchedSubtopic}`,
              topicId: targetTopicId,
              lessonId: topic.lessonId,
            },
          });

          resolvedSubtopicId = newSubtopic.id;
          resolvedSubtopicName = newSubtopic.name;

          this.logger.log(
            `Created new subtopic: ${newSubtopic.name} (${newSubtopic.id})`,
          );
        } else if (dto.subtopicAction === SubtopicResolutionAction.IGNORE) {
          this.logger.log(
            `Ignoring subtopic suggestion: ${dto.unmatchedSubtopic || 'N/A'}`,
          );
        }
      }

      /* =========================
       * STEP 3: UPDATE AFFECTED QUESTIONS
       * ========================= */
      const updateWhere: {
        lessonId: string;
        unmatchedTopic?: string;
        unmatchedSubtopic?: string;
      } = {
        lessonId: dto.lessonId,
      };

      if (dto.unmatchedTopic) {
        updateWhere.unmatchedTopic = dto.unmatchedTopic;
      }

      if (dto.unmatchedSubtopic) {
        updateWhere.unmatchedSubtopic = dto.unmatchedSubtopic;
      }

      // Count affected questions before update
      const affectedCount = await tx.examQuestion.count({
        where: updateWhere,
      });

      // Build update data
      const updateData: {
        topicId?: string;
        subtopicId?: string;
        unmatchedTopic?: null;
        unmatchedSubtopic?: null;
      } = {};

      if (dto.topicAction !== TopicResolutionAction.IGNORE && resolvedTopicId) {
        updateData.topicId = resolvedTopicId;
        updateData.unmatchedTopic = null;
      } else if (dto.topicAction === TopicResolutionAction.IGNORE) {
        updateData.unmatchedTopic = null; // Clear the unmatched field
      }

      if (
        dto.subtopicAction !== SubtopicResolutionAction.IGNORE &&
        resolvedSubtopicId
      ) {
        updateData.subtopicId = resolvedSubtopicId;
        updateData.unmatchedSubtopic = null;
      } else if (dto.subtopicAction === SubtopicResolutionAction.IGNORE) {
        updateData.unmatchedSubtopic = null; // Clear the unmatched field
      }

      // Update all affected questions
      if (Object.keys(updateData).length > 0) {
        await tx.examQuestion.updateMany({
          where: updateWhere,
          data: updateData,
        });

        this.logger.log(`Updated ${affectedCount} exam questions`);
      }

      /* =========================
       * STEP 4: LOG ADMIN ACTION
       * ========================= */
      await tx.adminAuditLog.create({
        data: {
          adminUserId,
          actionType: 'ONTOLOGY_RESOLUTION',
          actionMode: dto.topicAction || dto.subtopicAction || 'UNKNOWN',
          lessonId: dto.lessonId,
          topicId: resolvedTopicId,
          subtopicId: resolvedSubtopicId,
          success: true,
          resultCount: affectedCount,
          metadata: {
            unmatchedTopic: dto.unmatchedTopic,
            unmatchedSubtopic: dto.unmatchedSubtopic,
            topicAction: dto.topicAction,
            subtopicAction: dto.subtopicAction,
            adminNotes: dto.adminNotes,
          },
        },
      });

      return {
        affectedCount,
        resolvedTopicId,
        resolvedTopicName,
        resolvedSubtopicId,
        resolvedSubtopicName,
      };
    });

    /* =========================
     * STEP 5: BUILD RESPONSE
     * ========================= */
    const response: ResolveTopicResponseDto = {
      success: true,
      affectedQuestionCount: result.affectedCount,
      message: `Successfully resolved ${result.affectedCount} question(s)`,
    };

    if (dto.topicAction) {
      response.topicResolution = {
        action: dto.topicAction,
        topicId: result.resolvedTopicId || undefined,
        topicName: result.resolvedTopicName || undefined,
      };
    }

    if (dto.subtopicAction) {
      response.subtopicResolution = {
        action: dto.subtopicAction,
        subtopicId: result.resolvedSubtopicId || undefined,
        subtopicName: result.resolvedSubtopicName || undefined,
      };
    }

    this.logger.log(
      `Resolution complete: ${result.affectedCount} questions updated`,
    );

    return response;
  }
}
