import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConceptService } from './concept.service';
import { ConceptController } from './concept.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConceptResolverService } from './concept-resolver.service';
import { KnowledgePointAtomicityService } from './knowledge-point-atomicity.service';
import { KPAtomicityProcessor } from './kp-atomicity.processor';
import { QueueName } from '../queue/queues';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AIModule),
    BullModule.registerQueue({
      name: QueueName.KP_ATOMICITY,
    }),
  ],
  controllers: [ConceptController],
  providers: [
    ConceptService,
    ConceptResolverService,
    KnowledgePointAtomicityService,
    KPAtomicityProcessor,
  ],
  exports: [
    ConceptService,
    ConceptResolverService,
    KnowledgePointAtomicityService,
  ],
})
export class ConceptModule {}
