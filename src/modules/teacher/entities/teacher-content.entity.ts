import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClassSection } from '../../institute/entities/class-section.entity';
import { Teacher } from '../teacher.entity';

@Entity('teacher_content_items')
export class TeacherContent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @ManyToOne(() => ClassSection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_section_id' })
  class_section: ClassSection;

  @Column({ type: 'varchar', length: 64 })
  subject: string;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', nullable: true })
  questions: unknown[] | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  topic: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  difficulty: string | null;

  @Column({ default: false })
  assigned: boolean;

  @Column({ type: 'int', default: 0 })
  assigned_student_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
