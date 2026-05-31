import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from '../../student/student.entity';
import { TeacherAssignment } from './teacher-assignment.entity';

@Entity('assignment_submissions')
export class AssignmentSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TeacherAssignment, (a) => a.submissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assignment_id' })
  assignment: TeacherAssignment;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ type: 'varchar', length: 32, default: 'pending_review' })
  status: string;

  @Column({ default: false })
  ai_checked: boolean;

  @Column({ type: 'text', nullable: true })
  teacher_feedback: string | null;

  @CreateDateColumn()
  submitted_at: Date;
}
