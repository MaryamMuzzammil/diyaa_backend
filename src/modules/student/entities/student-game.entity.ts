import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from '../student.entity';

export enum GameSkillType {
  READING = 'reading',
  WRITING = 'writing',
  SPEAKING = 'speaking',
  LISTENING = 'listening',
}

@Entity('student_games')
export class StudentGame {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'varchar', length: 64 })
  subject: string;

  @Column({ type: 'int' })
  level_number: number;

  @Column({ type: 'int' })
  score: number;

  @Column({
    type: 'enum',
    enum: GameSkillType,
  })
  type: GameSkillType;

  @CreateDateColumn()
  created_at: Date;
}
