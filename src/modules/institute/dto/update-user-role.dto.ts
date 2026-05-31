import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../users/users.entity';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
