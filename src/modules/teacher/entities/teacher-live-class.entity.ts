import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassSection } from '../../institute/entities/class-section.entity';
import { Teacher } from '../teacher.entity';

@Entity('teacher_live_classes')
export class TeacherLiveClass {
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

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @CreateDateColumn()
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at: Date | null;
}
