import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../../Permissions/permissions.entity';
import { RolePermission } from '../../Permissions/role-permission.entity';
import { UserPermission } from '../../Permissions/user-permission.entity';
import { Role } from '../roles/roles.entity';
import { User } from '../users/users.entity';
import { InstitutePermissionsService } from '../institute/institute-permissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      Role,
      RolePermission,
      UserPermission,
      User,
    ]),
  ],
  providers: [InstitutePermissionsService],
  exports: [InstitutePermissionsService],
})
export class RbacModule {}
