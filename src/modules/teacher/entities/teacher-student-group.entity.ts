import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassSection } from '../../institute/entities/class-section.entity';
import { Teacher } from '../teacher.entity';
import { TeacherGroupMember } from './teacher-group-member.entity';

@Entity('teacher_student_groups')
export class TeacherStudentGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @ManyToOne(() => ClassSection, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'class_section_id' })
  class_section: ClassSection | null;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  level: string | null;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => TeacherGroupMember, (m) => m.group)
  members: TeacherGroupMember[];
}
