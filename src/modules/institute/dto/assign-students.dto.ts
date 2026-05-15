import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignStudentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  student_count?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  increment?: number;
}
