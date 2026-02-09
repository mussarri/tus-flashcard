/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Lesson, Subtopic, Topic } from '@prisma/client';
import e from 'express';

/**
 * Service for managing lesson, topic, and subtopic registry
 * Automatically creates and updates registry entries from exam question analysis
 */
@Injectable()
export class ExamQuestionRegistryService {
  private readonly logger = new Logger(ExamQuestionRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalize string to prevent duplicates from case/whitespace differences
   */
  private normalize(str: string | undefined | null): string | null {
    if (!str) return null;
    return str.trim();
  }

  /**
   * Ensure lesson exists in registry, create if not
   */
  async ensureLesson(lessonName: string): Promise<Lesson | null> {
    const normalized = this.normalize(lessonName);
    if (!normalized) return null;

    try {
      const lesson = await this.prisma.lesson.upsert({
        where: { name: normalized },
        create: {
          name: normalized,
          displayName: normalized,
          questionCount: 0,
          knowledgePointCount: 0,
        },
        update: {
          // Just ensure it exists, counts will be updated separately
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Lesson registered: ${normalized}`);
      return lesson;
    } catch (error) {
      this.logger.error(
        `Failed to register lesson ${normalized}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Ensure topic exists in registry, create if not
   */
  async ensureTopic(
    topicName: string,
    lessonName: string,
  ): Promise<Topic | null | void> {
    const normalizedTopic = this.normalize(topicName);
    const normalizedLesson = this.normalize(lessonName);

    if (!normalizedTopic || !normalizedLesson) return;

    try {
      // First ensure lesson exists
      const lesson = await this.ensureLesson(normalizedLesson);

      if (!lesson) {
        this.logger.error(
          `Cannot register topic ${normalizedTopic} because lesson ${normalizedLesson} could not be ensured.`,
        );
        return null;
      }

      const existingTopic = await this.prisma.topic.findUnique({
        where: {
          name_lessonId: {
            name: normalizedTopic,
            lessonId: lesson?.id,
          },
        },
      });

      if (existingTopic) {
        if (existingTopic.mergedIntoId) {
          return this.prisma.topic.findUnique({
            where: { id: existingTopic.mergedIntoId },
          });
        }
        return existingTopic;
      } else {
        await this.prisma.topic.create({
          data: {
            name: normalizedTopic,
            lessonId: lesson?.id,
            displayName: normalizedTopic,
            questionCount: 0,
            knowledgePointCount: 0,
          },
        });
      }

      this.logger.log(
        `Topic registered: ${normalizedTopic} (${normalizedLesson})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to register topic ${normalizedTopic} (${normalizedLesson}): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Ensure subtopic exists in registry, create if not
   */
  async ensureSubtopic(
    subtopicName: string,
    topicName: string,
    lessonName: string,
  ): Promise<Subtopic | null | void> {
    const normalizedSubtopic = this.normalize(subtopicName);
    const normalizedTopic = this.normalize(topicName);
    const normalizedLesson = this.normalize(lessonName);

    if (!normalizedSubtopic || !normalizedTopic || !normalizedLesson) return;

    try {
      // First ensure topic exists
      const topic = await this.ensureTopic(normalizedTopic, normalizedLesson);
      // Then ensure lesson exists
      // Then create/update subtopic
      if (!topic) {
        this.logger.error(
          `Cannot register subtopic ${normalizedSubtopic} because topic ${normalizedTopic} (${normalizedLesson}) could not be ensured.`,
        );
        return;
      }

      const lesson = await this.prisma.lesson.findUnique({
        where: { name: normalizedLesson },
      });

      if (!lesson) {
        this.logger.error(
          `Cannot register subtopic ${normalizedSubtopic} because lesson ${normalizedLesson} could not be found.`,
        );
        return;
      }

      const existing = await this.prisma.subtopic.findUnique({
        where: {
          name_topicId: {
            name: normalizedSubtopic,
            topicId: topic?.id,
          },
        },
      });

      // if (existing) {
      //   if (existing.mergedIntoId) {
      //     return this.prisma.subtopic.findUnique({
      //       where: { id: existing.mergedIntoId },
      //     });
      //   }
      //   return existing;
      // } else {
      //   await this.prisma.subtopic.create({
      //     data: {
      //       name: normalizedSubtopic,
      //       displayName: normalizedSubtopic,
      //       topicId: topic?.id,
      //       lessonId: lesson?.id,
      //       questionCount: 0,
      //       knowledgePointCount: 0,
      //     },
      //   });
      // }

      const res = await this.prisma.subtopic.upsert({
        where: {
          name_topicId: {
            name: normalizedSubtopic,
            topicId: topic?.id,
          },
        },
        create: {
          name: normalizedSubtopic,
          displayName: subtopicName.trim(),
          topicId: topic?.id,
          lessonId: lesson?.id,
        },
        update: {
          // Just ensure it exists, counts will be updated separately
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Subtopic registered: ${normalizedSubtopic} (${normalizedTopic}, ${normalizedLesson})`,
      );
      return res;
    } catch (error) {
      this.logger.error(
        `Failed to register subtopic ${normalizedSubtopic} (${normalizedTopic}, ${normalizedLesson}): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Update question counts for lesson, topic, and subtopic
   */
  // async updateQuestionCounts(
  //   lessonName?: string,
  //   topicName?: string,
  //   subtopicName?: string,
  // ): Promise<void> {
  //   const normalizedLesson = this.normalize(lessonName);
  //   const normalizedTopic = this.normalize(topicName);
  //   const normalizedSubtopic = this.normalize(subtopicName);

  //   try {
  //     // Update lesson count
  //     if (normalizedLesson) {
  //       const count = await this.prisma.examQuestion.count({
  //         where: {
  //           lesson: normalizedLesson,
  //           analysisStatus: 'ANALYZED',
  //         },
  //       });

  //       await this.prisma.lesson.update({
  //         where: { name: normalizedLesson },
  //         data: { questionCount: count },
  //       });

  //       this.logger.log(
  //         `Updated question count for lesson ${normalizedLesson}: ${count}`,
  //       );
  //     }

  //     const topicId = await this.prisma.topic.findUnique({
  //       where: {
  //         name_lesson: {
  //           name: normalizedTopic || '',
  //           lesson: normalizedLesson || '',
  //         },
  //       },
  //       select: { id: true },
  //     });

  //     // Update topic count
  //     if (normalizedTopic && normalizedLesson) {
  //       const count = await this.prisma.examQuestion.count({
  //         where: {
  //           lesson: normalizedLesson,
  //           topicId: topicId?.id,
  //           analysisStatus: 'ANALYZED',
  //         },
  //       });

  //       await this.prisma.topic.update({
  //         where: {
  //           name_lesson: {
  //             name: normalizedTopic,
  //             lesson: normalizedLesson,
  //           },
  //         },
  //         data: { questionCount: count },
  //       });

  //       this.logger.log(
  //         `Updated question count for topic ${normalizedTopic} (${normalizedLesson}): ${count}`,
  //       );
  //     }

  //     // Update subtopic count
  //     if (normalizedSubtopic && normalizedTopic && normalizedLesson) {
  //       const count = await this.prisma.examQuestion.count({
  //         where: {
  //           lesson: normalizedLesson,
  //           topicId: normalizedTopic,
  //           subtopicId: normalizedSubtopic,
  //           analysisStatus: 'ANALYZED',
  //         },
  //       });

  //       await this.prisma.subtopic.update({
  //         where: {
  //           name_topicName_lesson: {
  //             name: normalizedSubtopic,
  //             topicName: normalizedTopic,
  //             lesson: normalizedLesson,
  //           },
  //         },
  //         data: { questionCount: count },
  //       });

  //       this.logger.log(
  //         `Updated question count for subtopic ${normalizedSubtopic} (${normalizedTopic}, ${normalizedLesson}): ${count}`,
  //       );
  //     }
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to update question counts: ${error instanceof Error ? error.message : 'Unknown error'}`,
  //     );
  //   }
  // }

  /**
   * Register analysis results (ensure all entities exist and update counts)
   */
  async registerAnalysisResults(
    lesson?: string,
    topic?: string,
    subtopic?: string,
    examQuestionId?: string,
  ): Promise<{
    lesson: Lesson | null;
    topic: Topic | null;
    subtopic: Subtopic | null;
    examQuestionId?: string;
  }> {
    let lessonEntity;
    let topicEntity;
    let subtopicEntity;

    console.log(lesson, topic, subtopic);

    try {
      // Ensure all entities exist
      if (lesson) {
        lessonEntity = await this.ensureLesson(lesson);
      }

      if (topic && lesson) {
        topicEntity = await this.ensureTopic(topic, lesson);
      }

      if (subtopic && topic && lesson) {
        subtopicEntity = await this.ensureSubtopic(subtopic, topic, lesson);
        await this.prisma.examQuestion.update({
          where: { id: examQuestionId || '' },
          data: {
            lessonId: lessonEntity?.id,
            topicId: topicEntity?.id,
            subtopicId: subtopicEntity?.id,
          },
        });
      }

      // Update counts
      //await this.updateQuestionCounts(lesson, topic, subtopic);
      this.logger.log(
        `Analysis results registered: ${lesson || 'N/A'} > ${topic || 'N/A'} > ${subtopic || 'N/A'}`,
      );

      return {
        lesson: lessonEntity || null,
        topic: topicEntity || null,
        subtopic: subtopicEntity || null,
        examQuestionId: examQuestionId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to register analysis results: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        lesson: null,
        topic: null,
        subtopic: null,
      };
    }
  }

  /**
   * Get all lessons with statistics
   */
  async getAllLessons() {
    return this.prisma.lesson.findMany({
      orderBy: [{ questionCount: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Get topics for a lesson
   */
  async getTopicsForLesson(lessonName: string) {
    const lessonId = await this.prisma.lesson.findUnique({
      where: { name: lessonName },
      select: { id: true },
    });

    if (!lessonId) {
      return [];
    }
    return this.prisma.topic.findMany({
      where: { lessonId: lessonId.id },
      orderBy: [{ questionCount: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Get subtopics for a topic
   */
  async getSubtopicsForTopic(topicName: string, lessonName: string) {
    const lessonId = await this.prisma.lesson.findUnique({
      where: { name: lessonName },
      select: { id: true },
    });

    if (!lessonId) {
      return [];
    }

    if (!topicName) {
      return [];
    }

    if (!lessonName) {
      return [];
    }

    const topicId = await this.prisma.topic.findUnique({
      where: {
        name_lessonId: {
          name: topicName,
          lessonId: lessonId.id,
        },
      },
      select: { id: true },
    });

    if (!topicId) {
      return [];
    }

    return this.prisma.subtopic.findMany({
      where: {
        topicId: topicId ? topicId.id : undefined,
        lessonId: lessonId ? lessonId.id : undefined,
      },
      orderBy: [{ questionCount: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats() {
    const [lessons, topics, subtopics, totalQuestions] = await Promise.all([
      this.prisma.lesson.count(),
      this.prisma.topic.count(),
      this.prisma.subtopic.count(),
      this.prisma.examQuestion.count({
        where: { analysisStatus: 'ANALYZED' },
      }),
    ]);

    return {
      totalLessons: lessons,
      totalTopics: topics,
      totalSubtopics: subtopics,
      totalAnalyzedQuestions: totalQuestions,
    };
  }
}
