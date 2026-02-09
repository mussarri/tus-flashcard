import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { VisionService } from './vision.service';
import { VisionController } from './vision.controller';
import { VisionProcessor } from './vision.processor';
import { QueueName } from '../queue/queues';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.VISION,
    }),
    PrismaModule,
    AIModule,
  ],
  providers: [VisionService, VisionProcessor],
  controllers: [VisionController],
  exports: [VisionService],
})
export class VisionModule {}
