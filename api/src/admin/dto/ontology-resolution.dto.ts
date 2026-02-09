import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for listing unresolved topic/subtopic signals from AI analysis
 * Groups by (lesson, unmatchedTopic, unmatchedSubtopic) with frequency counts
 */
export class ListUnresolvedTopicsDto {
  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minOccurrences?: number; // Filter out low-frequency signals
}

/**
 * Response DTO for unresolved topics list
 */
export class UnresolvedTopicSignalDto {
  lesson: string;
  lessonId: string;
  unmatchedTopic: string | null;
  unmatchedSubtopic: string | null;
  frequency: number; // Number of affected questions
  exampleQuestionIds: string[]; // Sample question IDs for preview
}

/**
 * DTO for creating a new topic during resolution
 * CRITICAL: This is ONLY used when admin explicitly chooses to create a new topic
 * AI analysis NEVER auto-creates topics
 */
export class CreateNewTopicDto {
  @IsString()
  name: string;

  @IsString()
  lessonId: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for creating a new subtopic during resolution
 * CRITICAL: This is ONLY used when admin explicitly chooses to create a new subtopic
 * AI analysis NEVER auto-creates subtopics
 */
export class CreateNewSubtopicDto {
  @IsString()
  name: string;

  @IsString()
  topicId: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Resolution action types for ontology management
 * Each type requires different validation and business logic
 */
export enum TopicResolutionAction {
  MAP_EXISTING = 'MAP_EXISTING', // Map to existing topic (most common)
  CREATE_NEW = 'CREATE_NEW', // Create new topic (rare, requires approval)
  IGNORE = 'IGNORE', // Ignore this AI suggestion (bad data)
}

export enum SubtopicResolutionAction {
  MAP_EXISTING = 'MAP_EXISTING',
  CREATE_NEW = 'CREATE_NEW',
  IGNORE = 'IGNORE',
}

/**
 * Main DTO for resolving topic/subtopic mismatches
 * MUST be used in a transaction to ensure atomicity
 * MUST log admin action for audit trail
 */
export class ResolveTopicDto {
  // Identification: which unresolved signal are we fixing?
  @IsString()
  lessonId: string;

  @IsOptional()
  @IsString()
  unmatchedTopic?: string; // The AI-suggested topic string to resolve

  @IsOptional()
  @IsString()
  unmatchedSubtopic?: string; // The AI-suggested subtopic string to resolve

  // Topic Resolution (ONE of these must be provided)
  @IsOptional()
  @IsEnum(TopicResolutionAction)
  topicAction?: TopicResolutionAction;

  @IsOptional()
  @IsString()
  mapToExistingTopicId?: string; // If action=MAP_EXISTING

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateNewTopicDto)
  createNewTopic?: CreateNewTopicDto; // If action=CREATE_NEW

  // Subtopic Resolution (optional, applied after topic is resolved)
  @IsOptional()
  @IsEnum(SubtopicResolutionAction)
  subtopicAction?: SubtopicResolutionAction;

  @IsOptional()
  @IsString()
  mapToExistingSubtopicId?: string; // If subtopicAction=MAP_EXISTING

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateNewSubtopicDto)
  createNewSubtopic?: CreateNewSubtopicDto; // If subtopicAction=CREATE_NEW

  // Audit
  @IsOptional()
  @IsString()
  adminNotes?: string; // Why this resolution was chosen
}

/**
 * Response DTO for resolution operation
 * Provides feedback on what was changed
 */
export class ResolveTopicResponseDto {
  success: boolean;
  affectedQuestionCount: number;
  topicResolution?: {
    action: TopicResolutionAction;
    topicId?: string;
    topicName?: string;
  };
  subtopicResolution?: {
    action: SubtopicResolutionAction;
    subtopicId?: string;
    subtopicName?: string;
  };
  message: string;
}
