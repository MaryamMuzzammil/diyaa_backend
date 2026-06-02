import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '../../student/student.entity';
import { Parent } from '../parent.entity';

@Entity('parent_safety_controls')
@Unique(['parent', 'student', 'key'])
export class ParentSafetyControl {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Parent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Parent;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 128 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'varchar', length: 32, default: 'enabled' })
  value: string;

  @UpdateDateColumn()
  updated_at: Date;
}
