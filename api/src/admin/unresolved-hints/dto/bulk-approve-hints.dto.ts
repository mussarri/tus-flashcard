import { IsArray, IsString } from 'class-validator';

export class BulkApproveHintsDto {
  @IsArray()
  @IsString({ each: true })
  hintIds: string[];

  @IsString()
  conceptId: string;
}
