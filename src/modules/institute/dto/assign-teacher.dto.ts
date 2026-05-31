import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class AssignTeacherDto {
  @IsOptional()
  @IsString()
  teacher_name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacher_id?: number;
}
