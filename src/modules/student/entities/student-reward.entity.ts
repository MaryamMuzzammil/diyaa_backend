import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Student } from '../student.entity';

@Entity('student_rewards')
@Unique(['student', 'reward_key'])
export class StudentReward {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'varchar', length: 64 })
  reward_key: string;

  @Column({ type: 'varchar', length: 128 })
  title: string;

  @Column({ type: 'varchar', length: 32, default: 'points' })
  type: string;

  @Column({ type: 'int', nullable: true })
  awarded_by_user_id: number | null;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ default: false })
  claimed: boolean;

  @CreateDateColumn()
  earned_at: Date;
}
