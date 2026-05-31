import { DataSource } from 'typeorm';
import { Permission } from '../Permissions/permissions.entity';
import { RolePermission } from '../Permissions/role-permission.entity';
import { Role } from '../modules/roles/roles.entity';
import {
  INSTITUTE_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from './institute-permissions.catalog';

export async function seedInstituteRBAC(dataSource: DataSource) {
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);
  const rpRepo = dataSource.getRepository(RolePermission);

  const rolesData = [
    { name: 'SuperAdmin', description: 'Full platform access' },
    { name: 'Owner', description: 'Institute owner — full school access' },
    { name: 'Admin', description: 'Principal / sub-admin — operational access' },
    { name: 'Teacher', description: 'Assigned classes and academic content' },
    { name: 'Student', description: 'Self-only learning access' },
    { name: 'Parent', description: 'Linked children only' },
  ];

  const roles: Record<string, Role> = {};
  for (const r of rolesData) {
    let role = await roleRepo.findOne({ where: { name: r.name } });
    if (!role) role = roleRepo.create(r);
    else Object.assign(role, r);
    roles[r.name] = await roleRepo.save(role);
  }

  const perms: Record<string, Permission> = {};
  for (const def of INSTITUTE_PERMISSIONS) {
    let perm = await permRepo.findOne({ where: { name: def.name } });
    if (!perm) {
      perm = permRepo.create({
        name: def.name,
        module: def.module,
        description: def.description,
      });
    } else {
      perm.module = def.module;
      perm.description = def.description;
    }
    perms[def.name] = await permRepo.save(perm);
  }

  for (const [roleName, permissionNames] of Object.entries(
    ROLE_DEFAULT_PERMISSIONS,
  )) {
    const role = roles[roleName];
    if (!role) continue;

    const existing = await rpRepo.find({
      where: { role: { id: role.id } },
      relations: ['permission'],
    });

    const target = new Set(permissionNames);
    for (const rp of existing) {
      if (!target.has(rp.permission.name)) {
        await rpRepo.delete(rp.id);
      }
    }

    for (const permName of permissionNames) {
      const permission = perms[permName];
      if (!permission) continue;

      const linked = await rpRepo.findOne({
        where: {
          role: { id: role.id },
          permission: { id: permission.id },
        },
      });
      if (!linked) {
        await rpRepo.save({ role, permission });
      }
    }
  }

  console.log(
    `🔥 Institute RBAC seed complete (${INSTITUTE_PERMISSIONS.length} permissions)`,
  );
}
