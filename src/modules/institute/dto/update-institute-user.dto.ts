import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../users/users.entity';

export class UpdateInstituteUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @IsOptional()
  @IsString()
  confirm_password?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  class_or_branch?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  assignClass?: string;

  @IsOptional()
  @IsString()
  assign_class?: string;

  @IsOptional()
  @IsString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  permanent_address?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  birth_certificate_number?: string;

  @IsOptional()
  @IsString()
  birthCertificateNumber?: string;

  @IsOptional()
  @IsString()
  previous_school?: string;

  @IsOptional()
  @IsString()
  previousSchool?: string;

  @IsOptional()
  @IsString()
  medical_history?: string;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  financial_aid?: string;

  @IsOptional()
  @IsString()
  financialAid?: string;

  @IsOptional()
  @IsString()
  preferred_language?: string;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  avatar_id?: string;

  @IsOptional()
  @IsString()
  avatarId?: string;

  @IsOptional()
  @IsString()
  daily_goal?: string;

  @IsOptional()
  @IsString()
  dailyGoal?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  assignSubject?: string;

  @IsOptional()
  @IsString()
  assign_subject?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsString()
  employee_id?: string;
}
