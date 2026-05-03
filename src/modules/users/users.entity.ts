import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ManyToOne } from 'typeorm';
import { Institute } from '../institute/institute.entity';


export enum UserRole {
  SUPERADMIN = 'SuperAdmin',
  OWNER = 'Owner',
  ADMIN = 'Admin',
  TEACHER = 'Teacher',
  STUDENT = 'Student',
  PARENT = 'Parent',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ default: 'active' })
  status: string;
  
  @ManyToOne(() => Institute, (institute) => institute.users, { nullable: true })
  institute: Institute;
}