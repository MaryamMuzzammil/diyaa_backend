import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ClassSection } from '../../institute/entities/class-section.entity';
import { Student } from '../../student/student.entity';

@Entity('class_student_enrollments')
@Unique(['class_section', 'student'])
export class ClassStudentEnrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ClassSection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_section_id' })
  class_section: ClassSection;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @CreateDateColumn()
  enrolled_at: Date;
}
