import { Module } from '@nestjs/common';
import { ConceptService } from './concept.service';
import { ConceptController } from './concept.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConceptResolverService } from './concept-resolver.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConceptController],
  providers: [ConceptService, ConceptResolverService],
  exports: [ConceptService, ConceptResolverService],
})
export class ConceptModule {}
