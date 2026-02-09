import { Module } from '@nestjs/common';
import { UnresolvedHintsController } from './unresolved-hints.controller';
import { UnresolvedHintsService } from './unresolved-hints.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConceptModule } from '../../concept/concept.module';

@Module({
  imports: [PrismaModule, ConceptModule],
  controllers: [UnresolvedHintsController],
  providers: [UnresolvedHintsService],
  exports: [UnresolvedHintsService],
})
export class UnresolvedHintsModule {}
