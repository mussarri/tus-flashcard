import { Module } from '@nestjs/common';
import { AIModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminTopicExplanationController,
  StudentTopicExplanationController,
} from './topic-explanation.controller';
import { TopicExplanationService } from './topic-explanation.service';

@Module({
  imports: [PrismaModule, AIModule],
  controllers: [
    StudentTopicExplanationController,
    AdminTopicExplanationController,
  ],
  providers: [TopicExplanationService],
})
export class TopicExplanationModule {}
