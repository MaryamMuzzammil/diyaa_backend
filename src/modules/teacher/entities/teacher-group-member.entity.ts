import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Student } from '../../student/student.entity';
import { TeacherStudentGroup } from './teacher-student-group.entity';

@Entity('teacher_group_members')
@Unique(['group', 'student'])
export class TeacherGroupMember {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TeacherStudentGroup, (g) => g.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'group_id' })
  group: TeacherStudentGroup;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @CreateDateColumn()
  added_at: Date;
}
