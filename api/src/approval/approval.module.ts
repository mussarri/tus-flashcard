import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { QueueName } from '../queue/queues';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.KNOWLEDGE_EXTRACTION,
    }),
  ],
  providers: [ApprovalService],
  controllers: [ApprovalController],
  exports: [ApprovalService],
})
export class ApprovalModule {}
