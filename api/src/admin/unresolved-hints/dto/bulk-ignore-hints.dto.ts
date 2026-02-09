import { IsArray, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class BulkIgnoreHintsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  hintIds: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}
