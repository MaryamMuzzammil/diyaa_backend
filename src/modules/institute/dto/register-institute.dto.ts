import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  CREATE_PRINCIPAL_OPTIONS,
  INSTITUTE_TYPES,
  STUDENT_RANGES,
  TEACHER_RANGES,
} from '../institute.constants';

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === 1 || value === '1';

/**
 * Full institute onboarding + minimal signup (email, password, name, role).
 * Card fields are rejected in mapper — use payment_method_token only.
 */
export class RegisterInstituteDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  owner_full_name?: string;

  @IsOptional()
  @IsEmail()
  owner_email?: string;

  @IsOptional()
  @IsString()
  owner_phone?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  confirm_password?: string;

  @IsOptional()
  @IsString()
  institute_name?: string;

  @ValidateIf((o) => o.institute_type != null && o.institute_type !== '')
  @IsIn([...INSTITUTE_TYPES])
  institute_type?: string;

  @IsOptional()
  @IsString()
  registration_number?: string;

  @IsOptional()
  @IsString()
  logo_file_name?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @ValidateIf((o) => o.create_principal != null && o.create_principal !== '')
  @IsIn([...CREATE_PRINCIPAL_OPTIONS])
  create_principal?: string;

  @IsOptional()
  @IsString()
  principal_name?: string;

  @IsOptional()
  @IsEmail()
  principal_email?: string;

  @IsOptional()
  @IsString()
  principal_phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  principal_password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grades_offered?: string[];

  @ValidateIf((o) => o.student_range != null && o.student_range !== '')
  @IsIn([...STUDENT_RANGES])
  student_range?: string;

  @ValidateIf((o) => o.teacher_range != null && o.teacher_range !== '')
  @IsIn([...TEACHER_RANGES])
  teacher_range?: string;

  @IsOptional()
  @IsString()
  plan_name?: string;

  @IsOptional()
  @IsString()
  plan_price?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  trial_days?: number;

  @IsOptional()
  @IsString()
  billing_name?: string;

  @IsOptional()
  @IsString()
  billing_address?: string;

  @IsOptional()
  @IsString()
  payment_method_token?: string;

  @IsOptional()
  @IsString()
  payment_last4?: string;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  accept_terms?: boolean;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  accept_privacy?: boolean;

  @IsOptional()
  card_number?: string;

  @IsOptional()
  card_expiry?: string;

  @IsOptional()
  card_cvv?: string;
}
