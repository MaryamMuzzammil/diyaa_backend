import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @MinLength(2)
  title: string;

  @IsString()
  subject: string;

  @Type(() => Number)
  @IsInt()
  class_section_id: number;

  @IsDateString()
  due_date: string;

  @IsOptional()
  @IsString()
  status?: string;
}
