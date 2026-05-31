import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ClassSection } from '../../institute/entities/class-section.entity';
import { Teacher } from '../teacher.entity';

@Entity('teacher_class_assignments')
@Unique(['teacher', 'class_section'])
export class TeacherClassAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @ManyToOne(() => ClassSection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_section_id' })
  class_section: ClassSection;

  @Column('simple-array', { nullable: true })
  subjects: string[] | null;

  @CreateDateColumn()
  created_at: Date;
}
