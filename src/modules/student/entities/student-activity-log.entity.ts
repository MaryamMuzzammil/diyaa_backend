import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from '../student.entity';

@Entity('student_activity_logs')
export class StudentActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'varchar', length: 32 })
  activity_type: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  subject: string | null;

  @Column({ type: 'int', nullable: true })
  level_number: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  skill: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  game_key: string | null;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ default: false })
  won: boolean;

  @Column({ type: 'int', default: 0 })
  duration_minutes: number;

  @CreateDateColumn()
  created_at: Date;
}
