import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from '../student.entity';

@Entity('student_dashboard_summary')
export class StudentDashboardSummary {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'int', default: 0 })
  total_xp: number;

  /** UI "Stars" — earned from games (dynamic). */
  @Column({ type: 'int', default: 0 })
  stars: number;

  @Column({ type: 'int', default: 0 })
  current_streak: number;

  @Column({ type: 'int', default: 0 })
  longest_streak: number;

  @Column({ type: 'int', default: 0 })
  lessons_completed: number;

  @Column({ type: 'int', default: 0 })
  games_won: number;

  @Column({ type: 'int', default: 0 })
  games_played: number;

  @Column({ type: 'int', default: 0 })
  today_minutes: number;

  /** Last calendar day with activity (YYYY-MM-DD) for streak logic. */
  @Column({ type: 'date', nullable: true })
  last_activity_date: string | null;

  @UpdateDateColumn()
  updated_at: Date;
}
