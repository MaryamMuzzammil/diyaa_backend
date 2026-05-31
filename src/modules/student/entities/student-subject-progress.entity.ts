import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '../student.entity';

@Entity('student_subject_progress')
@Unique(['student', 'subject'])
export class StudentSubjectProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'varchar', length: 64 })
  subject: string;

  @Column({ type: 'int', default: 0 })
  levels_total: number;

  @Column({ type: 'int', default: 0 })
  levels_completed: number;

  @Column({ type: 'int', default: 0 })
  total_score: number;

  @Column({ type: 'int', default: 0 })
  progress_percent: number;

  @UpdateDateColumn()
  updated_at: Date;
}
