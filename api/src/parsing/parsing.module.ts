import { Module } from '@nestjs/common';
import { ParsingService } from './parsing.service';
import { ParsingController } from './parsing.controller';

@Module({
  providers: [ParsingService],
  controllers: [ParsingController],
  exports: [ParsingService],
})
export class ParsingModule {}
