import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Student } from '../../student/student.entity';
import { Parent } from '../parent.entity';

@Entity('parent_student_links')
@Unique(['parent', 'student'])
export class ParentStudentLink {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Parent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Parent;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @CreateDateColumn()
  linked_at: Date;
}
