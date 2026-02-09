import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FlashcardTypeValidator } from './validators/flashcard-type.validator';
import { AuditLogService } from './services/audit-log.service';
import { VisualAssetService } from './services/visual-asset.service';

@Module({
  imports: [PrismaModule],
  providers: [FlashcardTypeValidator, AuditLogService, VisualAssetService],
  exports: [FlashcardTypeValidator, AuditLogService, VisualAssetService],
})
export class CommonModule {}
