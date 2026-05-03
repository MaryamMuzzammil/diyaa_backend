// import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
// import { Role } from '../modules/roles/roles.entity';
// import { Permission } from './permissions.entity';

// @Entity()
// export class RolePermission {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @ManyToOne(() => Role, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'role_id' })
//   role: Role;

//   @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'permission_id' })
//   permission: Permission;
// }

import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Role } from '../modules/roles/roles.entity';
import { Permission } from './permissions.entity';

@Unique(['role', 'permission']) // 🔥 YEH LINE ADD KARO
@Entity()
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}