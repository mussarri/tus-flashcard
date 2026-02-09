import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OntologyResolutionService } from './ontology-resolution.service';
import {
  ListUnresolvedTopicsDto,
  ResolveTopicDto,
  ResolveTopicResponseDto,
  UnresolvedTopicSignalDto,
} from './dto/ontology-resolution.dto';

/**
 * Controller for Admin Topic/Subtopic Resolution
 *
 * CRITICAL: This is the ONLY admin interface for resolving AI-generated ontology suggestions
 * AI analysis NEVER auto-creates topics/subtopics - admins must explicitly approve here
 */
@Controller('admin/ontology')
export class OntologyResolutionController {
  constructor(
    private readonly ontologyResolutionService: OntologyResolutionService,
  ) {}

  /**
   * GET /admin/ontology/unresolved-topics
   *
   * Lists all unresolved topic/subtopic signals from AI analysis
   * Grouped by (lesson, unmatchedTopic, unmatchedSubtopic) with frequency counts
   *
   * Query params:
   * - lessonId?: Filter by specific lesson
   * - minOccurrences?: Filter out signals that occur less than N times (default: 1)
   *
   * Response: Array of UnresolvedTopicSignalDto
   * [
   *   {
   *     lesson: "Anatomi",
   *     lessonId: "uuid",
   *     unmatchedTopic: "Kafatası Tabanı",
   *     unmatchedSubtopic: "Foramenler",
   *     frequency: 15,
   *     exampleQuestionIds: ["uuid1", "uuid2", "uuid3"]
   *   },
   *   ...
   * ]
   */
  @Get('unresolved-topics')
  async listUnresolvedTopics(
    @Query() query: ListUnresolvedTopicsDto,
  ): Promise<UnresolvedTopicSignalDto[]> {
    return this.ontologyResolutionService.listUnresolvedTopics(query);
  }

  /**
   * POST /admin/ontology/resolve-topic
   *
   * Resolves a topic/subtopic signal by:
   * 1. Mapping to existing Topic/Subtopic (most common)
   * 2. Creating new Topic/Subtopic (rare, requires explicit admin approval)
   * 3. Ignoring the suggestion (bad AI data)
   *
   * CRITICAL: This runs in a transaction and:
   * - Updates ALL affected ExamQuestions
   * - Logs admin action for audit trail
   * - Validates ontology consistency
   * - Affects downstream analytics & prerequisites
   *
   * Body: ResolveTopicDto
   * {
   *   lessonId: "uuid",
   *   unmatchedTopic: "Kafatası Tabanı",
   *   topicAction: "MAP_EXISTING" | "CREATE_NEW" | "IGNORE",
   *   mapToExistingTopicId?: "uuid",  // If MAP_EXISTING
   *   createNewTopic?: { name, lessonId, displayName?, description? }, // If CREATE_NEW
   *   subtopicAction?: "MAP_EXISTING" | "CREATE_NEW" | "IGNORE",
   *   mapToExistingSubtopicId?: "uuid",
   *   createNewSubtopic?: { name, topicId, displayName?, description? },
   *   adminNotes?: "Why this resolution was chosen"
   * }
   *
   * Response: ResolveTopicResponseDto
   * {
   *   success: true,
   *   affectedQuestionCount: 15,
   *   topicResolution: { action: "MAP_EXISTING", topicId: "uuid", topicName: "Skull Base" },
   *   subtopicResolution: { action: "CREATE_NEW", subtopicId: "uuid", subtopicName: "Foramina" },
   *   message: "Successfully resolved 15 question(s)"
   * }
   */
  @Post('resolve-topic')
  @HttpCode(HttpStatus.OK)
  async resolveTopic(
    @Body() dto: ResolveTopicDto,
  ): Promise<ResolveTopicResponseDto> {
    // TODO: Get actual admin user ID from auth context
    const adminUserId = 'system'; // Replace with real auth when implemented

    return this.ontologyResolutionService.resolveTopic(dto, adminUserId);
  }
}
