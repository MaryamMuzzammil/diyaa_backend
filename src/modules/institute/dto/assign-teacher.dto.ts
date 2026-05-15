import { IsOptional, IsString } from 'class-validator';

export class AssignTeacherDto {
  @IsOptional()
  @IsString()
  teacher_name?: string;
}
