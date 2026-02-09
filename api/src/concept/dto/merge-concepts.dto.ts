import { IsString, IsUUID } from 'class-validator';

export class MergeConceptsDto {
  @IsString()
  @IsUUID()
  sourceId: string;

  @IsString()
  @IsUUID()
  targetId: string;
}
