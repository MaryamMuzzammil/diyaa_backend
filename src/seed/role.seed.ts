import { DataSource } from 'typeorm';
import { Role } from '../modules/roles/roles.entity';
import { Permission } from '../Permissions/permissions.entity';
import { RolePermission } from '../Permissions/role-permission.entity';

export const seedRBAC = async (dataSource: DataSource) => {
  const roleRepo = dataSource.getRepository(Role);
  const permRepo = dataSource.getRepository(Permission);
  const rpRepo = dataSource.getRepository(RolePermission);

  // 🔹 Roles
  const rolesData = [
    { name: 'SuperAdmin', description: 'Full system access' },
    { name: 'Owner', description: 'Institute owner' },
    { name: 'Admin', description: 'Manage system' },
    { name: 'Teacher', description: 'Manage classes' },
    { name: 'Student', description: 'Learning access' },
    { name: 'Parent', description: 'Track child' },
  ];

  // 🔹 Permissions
  const permissionsData = [
    'create_user',
    'delete_user',
    'update_user',
    'view_user',
    'assign_teacher',
    'create_course',
    'view_course',
    'manage_roles',
    'manage_permissions',
  ].map(name => ({ name }));

  // 🔹 UPSERT ROLES
  const roles: Record<string, Role> = {};
  for (const r of rolesData) {
    let role = await roleRepo.findOne({ where: { name: r.name } });
    if (!role) role = roleRepo.create(r);
    else Object.assign(role, r);
    roles[r.name] = await roleRepo.save(role);
  }

  // 🔹 UPSERT PERMISSIONS
  const perms: Record<string, Permission> = {};
  for (const p of permissionsData) {
    let perm = await permRepo.findOne({ where: { name: p.name } });
    if (!perm) perm = permRepo.create(p);
    perms[p.name] = await permRepo.save(perm);
  }

  // 🔹 ROLE → PERMISSION MAP
  const map = {
    SuperAdmin: Object.keys(perms),
    Admin: [
      'create_user',
      'delete_user',
      'update_user',
      'view_user',
    ],
    Teacher: ['view_user'],
    Student: [],
    Parent: [],
    Owner: ['manage_roles', 'manage_permissions'],
  };

  for (const roleName in map) {
    const role = roles[roleName];
    for (const permName of map[roleName]) {
      const permission = perms[permName];

      const exists = await rpRepo.findOne({
        where: {
          role: { id: role.id },
          permission: { id: permission.id },
        },
        relations: ['role', 'permission'],
      });

      if (!exists) {
        await rpRepo.save({
          role,
          permission,
        });
      }
    }
  }

  console.log('🔥 RBAC SEED COMPLETE');
};