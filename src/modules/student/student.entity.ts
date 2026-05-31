import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Institute } from '../institute/institute.entity';
import { User } from '../users/users.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'institute_id', type: 'int', nullable: true })
  institute_id: number | null;

  @ManyToOne(() => Institute, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'institute_id' })
  institute: Institute | null;

  @Column({ name: 'user_id', type: 'int', unique: true })
  user_id: number;

  @OneToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  grade: string | null;

  @Column({ type: 'varchar', length: 128, default: 'Main Campus' })
  branch: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  avatar_id: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  preferred_language: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  daily_goal: string | null;

  @Column({ type: 'varchar', length: 32, default: 'email' })
  signup_method: string;

  @Column({ default: false })
  is_free_student: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
