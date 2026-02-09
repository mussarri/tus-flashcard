import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class BatchGenerateFlashcardsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  knowledgePointIds: string[];
}
