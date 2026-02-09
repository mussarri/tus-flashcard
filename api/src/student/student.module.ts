import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StudentFlashcardController } from './student-flashcard.controller';
import { StudentFlashcardService } from './student-flashcard.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentController, StudentFlashcardController],
  providers: [StudentService, StudentFlashcardService],
  exports: [StudentService, StudentFlashcardService],
})
export class StudentModule {}
