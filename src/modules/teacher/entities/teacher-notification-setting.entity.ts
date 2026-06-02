import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Teacher } from '../teacher.entity';

@Entity('teacher_notification_settings')
export class TeacherNotificationSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({ default: true })
  student_submissions: boolean;

  @Column({ default: true })
  low_performance_alerts: boolean;

  @Column({ default: true })
  weekly_reports: boolean;

  @Column({ default: true })
  ai_suggestions: boolean;

  @UpdateDateColumn()
  updated_at: Date;
}
