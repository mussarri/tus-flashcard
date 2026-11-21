import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TopicExplanationStatus } from '@prisma/client';
import { TopicExplanationService } from './topic-explanation.service';

@Controller('api/student/flashcards')
export class StudentTopicExplanationController {
  constructor(private readonly service: TopicExplanationService) {}

  @Get(':cardId/topic-explanation')
  getForCard(@Param('cardId') cardId: string) {
    return this.service.getForCard(cardId);
  }

  @Post(':cardId/topic-explanation')
  getOrCreateForCard(@Param('cardId') cardId: string) {
    return this.service.getOrCreateForCard(cardId);
  }
}

@Controller('api/student/topic-explanations')
export class StudentTopicExplanationStudyController {
  constructor(private readonly service: TopicExplanationService) {}

  @Get('catalog')
  catalog() {
    return this.service.studyCatalog();
  }

  @Get()
  list(
    @Query('lessonId') lessonId?: string,
    @Query('topicId') topicId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const parsedPage = Number(page || 1);
    const parsedSize = Number(pageSize || 20);
    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedSize) ||
      parsedSize < 1 ||
      parsedSize > 50
    ) {
      throw new BadRequestException('Invalid pagination');
    }
    return this.service.listForStudy(lessonId, topicId, parsedPage, parsedSize);
  }
}

@Controller('admin/topic-explanations')
export class AdminTopicExplanationController {
  constructor(private readonly service: TopicExplanationService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('lessonId') lessonId?: string,
    @Query('topicId') topicId?: string,
    @Query('search') search?: string,
  ) {
    const valid = ['DRAFT', 'APPROVED', 'REJECTED'];
    if (status && !valid.includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    const parsedPage = Number(page || 1);
    const parsedSize = Number(pageSize || 20);
    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1 ||
      !Number.isInteger(parsedSize) ||
      parsedSize < 1 ||
      parsedSize > 100
    ) {
      throw new BadRequestException('Invalid pagination');
    }
    return this.service.list(
      status as TopicExplanationStatus | undefined,
      parsedPage,
      parsedSize,
      { lessonId, topicId, search: search?.trim() },
    );
  }

  @Get('catalog')
  catalog() {
    return this.service.adminCatalog();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  create(
    @UploadedFile() image: Express.Multer.File | undefined,
    @Body()
    body: {
      title?: unknown;
      content?: unknown;
      lessonId?: unknown;
      topicId?: unknown;
      status?: unknown;
    },
  ) {
    if (
      typeof body?.title !== 'string' ||
      !body.title.trim() ||
      typeof body.content !== 'string' ||
      !body.content.trim() ||
      typeof body.lessonId !== 'string' ||
      !body.lessonId.trim() ||
      typeof body.topicId !== 'string' ||
      !body.topicId.trim() ||
      (body.status !== undefined &&
        !['DRAFT', 'APPROVED'].includes(body.status as string))
    )
      throw new BadRequestException('Invalid topic explanation');
    return this.service.create(
      {
        title: body.title,
        content: body.content,
        lessonId: body.lessonId,
        topicId: body.topicId,
        status: (body.status ?? 'DRAFT') as 'DRAFT' | 'APPROVED',
      },
      image,
    );
  }

  @Post('bulk-approve')
  bulkApprove(@Body() body: { ids?: unknown }) {
    if (
      !Array.isArray(body?.ids) ||
      body.ids.length === 0 ||
      body.ids.length > 100 ||
      body.ids.some((id: unknown) => typeof id !== 'string' || !id.trim())
    ) {
      throw new BadRequestException('Select 1 to 100 explanations');
    }
    return this.service.bulkApprove([...new Set(body.ids as string[])]);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { title?: unknown; content?: unknown; status?: unknown },
  ) {
    if (
      (body.title !== undefined && typeof body.title !== 'string') ||
      (body.content !== undefined && typeof body.content !== 'string') ||
      (body.status !== undefined &&
        (typeof body.status !== 'string' ||
          !['DRAFT', 'APPROVED', 'REJECTED'].includes(body.status)))
    ) {
      throw new BadRequestException('Invalid topic explanation update');
    }
    return this.service.update(
      id,
      body as {
        title?: string;
        content?: string;
        status?: TopicExplanationStatus;
      },
    );
  }
}
