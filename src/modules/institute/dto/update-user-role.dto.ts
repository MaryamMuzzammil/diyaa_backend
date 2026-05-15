import { IsEnum } from 'class-validator';
import { UserRole } from '../../users/users.entity';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
