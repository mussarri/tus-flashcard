import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { BullModule } from '@nestjs/bullmq';
import { QueueName } from '../queue/queues';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.VISION,
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
