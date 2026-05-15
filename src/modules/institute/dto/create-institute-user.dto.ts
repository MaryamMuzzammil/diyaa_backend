import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../users/users.entity';

export class CreateInstituteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  class_or_branch?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  institute_id?: number;
}
