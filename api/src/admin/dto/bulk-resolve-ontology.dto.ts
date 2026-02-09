import { IsArray, IsString, IsIn } from 'class-validator';

export class BulkResolveOntologyDto {
  @IsArray()
  @IsString({ each: true })
  questionIds: string[];

  @IsIn(['APPROVE_AS_IS', 'REJECT_SUGGESTIONS'])
  action: 'APPROVE_AS_IS' | 'REJECT_SUGGESTIONS';
}
