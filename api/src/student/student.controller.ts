/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { StudentService } from './student.service';

/**
 * Student-facing controller for QuestionCard solving flow
 * Handles fetching APPROVED questions and submitting answers
 */
@Controller('api/student/questions')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  /**
   * Get APPROVED questions for practice
   * Filters: lesson, topic, subtopic, difficulty, sourceType
   * @returns Paginated list of approved QuestionCards (without answers)
   */
  @Get()
  async getQuestions(
    @Query('lessonId') lessonId?: string,
    @Query('topicId') topicId?: string,
    @Query('subtopicId') subtopicId?: string,
    @Query('difficulty') difficulty?: 'EASY' | 'MEDIUM' | 'HARD',
    @Query('sourceType') sourceType?: 'ADMIN' | 'AI_GENERATION' | 'ERROR_BASED',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id; // Extract from JWT if auth is enabled

    return this.studentService.getApprovedQuestions({
      lessonId,
      topicId,
      subtopicId,
      difficulty,
      sourceType,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      userId, // For adaptive filtering (optional)
    });
  }

  /**
   * Get all lessons (for filtering, dropdowns, etc)
   */
  @Get('all-lessons')
  async getAllLessons() {
    return this.studentService.getAllLessons();
  }

  /**
   * Get user's weak knowledge points (for targeted practice)
   */
  @Get('weaknesses/analysis')
  async getUserWeaknesses(
    @Query('userId') userId: string,
    @Query('threshold') threshold?: string,
    @Query('limit') limit?: string,
  ) {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.studentService.getUserWeaknesses(
      userId,
      threshold ? parseFloat(threshold) : 0.5,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Get a single question by ID (APPROVED only)
   * Returns question without revealing correct answer
   */
  @Get(':id')
  async getQuestion(@Param('id') id: string) {
    return this.studentService.getQuestionById(id);
  }

  /**
   * Submit an answer to a question
   * Creates UserAnswer, updates QuestionCard stats, handles UserWeakness
   * @body selectedAnswer - User's selected option (A, B, C, D, E)
   * @body timeSpent - Time spent in seconds (optional)
   * @returns { isCorrect, correctAnswer, explanation, knowledgePointsAffected }
   */
  @Post(':id/answer')
  async submitAnswer(
    @Param('id') questionId: string,
    @Body()
    body: { userId: string; selectedAnswer: string; timeSpent?: number },
    @Request() req?: any,
  ) {
    const userId = body.userId || req?.user?.id;

    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.UNAUTHORIZED);
    }

    if (!body.selectedAnswer) {
      throw new HttpException(
        'selectedAnswer is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.studentService.submitAnswer({
      userId,
      questionId,
      selectedAnswer: body.selectedAnswer,
      timeSpent: body.timeSpent,
    });
  }

  /**
   * Get user's answer history for a specific question
   */
  @Get(':id/history')
  async getAnswerHistory(
    @Param('id') questionId: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.studentService.getAnswerHistory(userId, questionId);
  }
}
