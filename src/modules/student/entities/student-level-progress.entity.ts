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

@Entity('student_level_progress')
@Unique(['student', 'subject', 'level_number'])
export class StudentLevelProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'varchar', length: 64 })
  subject: string;

  @Column({ type: 'int' })
  level_number: number;

  @Column({ type: 'varchar', length: 16, default: 'locked' })
  status: string;

  @Column({ type: 'int', default: 0 })
  total_score: number;

  @Column({ type: 'int', default: 0 })
  games_completed: number;

  @Column({ type: 'int', default: 0 })
  games_total: number;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @UpdateDateColumn()
  updated_at: Date;
}
