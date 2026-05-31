import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../../Permissions/permissions.entity';
import { UserPermission } from '../../Permissions/user-permission.entity';
import { RolePermission } from '../../Permissions/role-permission.entity';
import { Role } from '../roles/roles.entity';
import { User, UserRole } from '../users/users.entity';
import {
  INSTITUTE_ASSIGNABLE_ROLES,
  INSTITUTE_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from '../../seed/institute-permissions.catalog';
import { Actor } from './institute-access.service';

@Injectable()
export class InstitutePermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permRepo: Repository<Permission>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private rolePermRepo: Repository<RolePermission>,
    @InjectRepository(UserPermission)
    private userPermRepo: Repository<UserPermission>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  getCatalog() {
    const byModule: Record<
      string,
      Array<{ name: string; description: string }>
    > = {};

    for (const def of INSTITUTE_PERMISSIONS) {
      if (!byModule[def.module]) byModule[def.module] = [];
      byModule[def.module].push({
        name: def.name,
        description: def.description,
      });
    }

    return {
      modules: Object.keys(byModule).sort(),
      permissions_by_module: byModule,
      all_permissions: INSTITUTE_PERMISSIONS.map((p) => p.name),
      assignable_roles: [...INSTITUTE_ASSIGNABLE_ROLES],
    };
  }

  async getRoleDefaults(roleName: string) {
    const normalized = this.normalizeRoleName(roleName);
    const names =
      ROLE_DEFAULT_PERMISSIONS[normalized] ??
      ROLE_DEFAULT_PERMISSIONS[UserRole.STUDENT];

    return {
      role: normalized,
      permissions: names,
      permissions_by_module: this.groupNamesByModule(names),
    };
  }

  async getUserPermissions(userId: number) {
    const names = await this.getUserPermissionNames(userId);
    return {
      user_id: userId,
      permissions: names,
      permissions_by_module: this.groupNamesByModule(names),
    };
  }

  async getUserPermissionNames(userId: number): Promise<string[]> {
    const rows = await this.userPermRepo.find({
      where: { user: { user_id: userId } },
      relations: ['permission'],
    });
    if (rows.length > 0) {
      return rows.map((r) => r.permission.name).sort();
    }

    const user = await this.userRepo.findOne({ where: { user_id: userId } });
    if (!user) return [];
    return this.getRoleDefaultPermissionNames(user.role);
  }

  async applyRoleDefaultsToUser(user: User) {
    const names = await this.getRoleDefaultPermissionNames(user.role);
    await this.setUserPermissions(user.user_id, names);
    return names;
  }

  async setUserPermissions(userId: number, permissionNames: string[]) {
    const unique = [...new Set(permissionNames.map((n) => n.trim()))];
    await this.assertValidPermissionNames(unique);

    const user = await this.userRepo.findOne({ where: { user_id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.userPermRepo.delete({ user: { user_id: userId } });

    if (unique.length === 0) return [];

    const permissions = await this.permRepo.find({
      where: { name: In(unique) },
    });

    if (permissions.length !== unique.length) {
      const found = new Set(permissions.map((p) => p.name));
      const missing = unique.filter((n) => !found.has(n));
      throw new BadRequestException(
        `Unknown permissions: ${missing.join(', ')}`,
      );
    }

    await this.userPermRepo.save(
      permissions.map((permission) =>
        this.userPermRepo.create({ user, permission }),
      ),
    );

    return unique.sort();
  }

  assertOwnerCanAssignRole(actor: Actor, targetRole: UserRole) {
    if (targetRole === UserRole.SUPERADMIN) {
      throw new ForbiddenException('Cannot assign SuperAdmin role');
    }
    if (targetRole === UserRole.OWNER && actor.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException(
        'Only platform SuperAdmin can assign Owner role',
      );
    }
    if (
      actor.role === UserRole.OWNER &&
      !INSTITUTE_ASSIGNABLE_ROLES.includes(
        targetRole as (typeof INSTITUTE_ASSIGNABLE_ROLES)[number],
      )
    ) {
      throw new BadRequestException(
        `Owner can only assign: ${INSTITUTE_ASSIGNABLE_ROLES.join(', ')}`,
      );
    }
  }

  filterPermissionsForRole(
    role: UserRole,
    requested: string[] | undefined,
    actor?: Actor,
  ): string[] | undefined {
    if (!requested?.length) return undefined;

    if (
      actor?.role === UserRole.OWNER ||
      actor?.role === UserRole.SUPERADMIN
    ) {
      return requested;
    }

    const allowed = new Set(
      ROLE_DEFAULT_PERMISSIONS[role] ?? ROLE_DEFAULT_PERMISSIONS.Student,
    );

    const invalid = requested.filter((p) => !allowed.has(p));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Permissions not allowed for role ${role}: ${invalid.join(', ')}`,
      );
    }
    return requested;
  }

  private async getRoleDefaultPermissionNames(role: UserRole): Promise<string[]> {
    const roleEntity = await this.roleRepo.findOne({
      where: { name: role },
    });
    if (!roleEntity) {
      return ROLE_DEFAULT_PERMISSIONS[role] ?? [];
    }

    const links = await this.rolePermRepo.find({
      where: { role: { id: roleEntity.id } },
      relations: ['permission'],
    });

    if (links.length > 0) {
      return links.map((l) => l.permission.name).sort();
    }

    return ROLE_DEFAULT_PERMISSIONS[role] ?? [];
  }

  private groupNamesByModule(names: string[]) {
    const set = new Set(names);
    const grouped: Record<string, string[]> = {};
    for (const def of INSTITUTE_PERMISSIONS) {
      if (!set.has(def.name)) continue;
      if (!grouped[def.module]) grouped[def.module] = [];
      grouped[def.module].push(def.name);
    }
    return grouped;
  }

  private normalizeRoleName(role: string): string {
    const map: Record<string, string> = {
      owner: 'Owner',
      admin: 'Admin',
      teacher: 'Teacher',
      student: 'Student',
      parent: 'Parent',
      superadmin: 'SuperAdmin',
      'sub admin': 'Admin',
      sub_admin: 'Admin',
    };
    return map[role.toLowerCase()] ?? role;
  }

  private async assertValidPermissionNames(names: string[]) {
    if (names.length === 0) return;
    const rows = await this.permRepo.find({ where: { name: In(names) } });
    if (rows.length !== names.length) {
      const found = new Set(rows.map((r) => r.name));
      throw new BadRequestException(
        `Unknown permissions: ${names.filter((n) => !found.has(n)).join(', ')}`,
      );
    }
  }
}
