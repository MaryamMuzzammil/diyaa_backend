import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Institute } from '../institute/institute.entity';

/** SuperAdmin + free (B2C) Student may have null institute_id; all other roles require it. */
export function roleAllowsNullInstitute(role: UserRole): boolean {
  return role === UserRole.SUPERADMIN || role === UserRole.STUDENT;
}


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

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date | null;

  @Column({ type: 'int', nullable: true })
  age: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  gender: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  permanent_address: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  birth_certificate_number: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  previous_school: string | null;

  @Column({ type: 'text', nullable: true })
  medical_history: string | null;

  @Column({ type: 'text', nullable: true })
  financial_aid: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  grade: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  preferred_language: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  avatar_id: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  daily_goal: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  signup_method: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  branch: string | null;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_active_at: Date | null;

  @Column({ name: 'institute_id', type: 'int', nullable: true })
  institute_id: number | null;

  @ManyToOne(() => Institute, (institute) => institute.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'institute_id' })
  institute: Institute | null;
}