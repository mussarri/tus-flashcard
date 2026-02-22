import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { ManualBatchService } from './manual-batch.service';
import { BullModule } from '@nestjs/bullmq';
import { QueueName } from '../queue/queues';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.VISION,
    }),
    CommonModule,
  ],
  controllers: [UploadController],
  providers: [UploadService, ManualBatchService],
  exports: [UploadService, ManualBatchService],
})
export class UploadModule {}
