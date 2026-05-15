import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Institute } from '../institute.entity';

@Entity()
export class ClassSection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  grade: string;

  @Column({ default: 'A' })
  section: string;

  @Column({ default: 'Main Campus' })
  branch: string;

  @Column({ type: 'int', default: 0 })
  student_count: number;

  @Column('simple-array', { default: '' })
  teacher_names: string[];

  @ManyToOne(() => Institute, { onDelete: 'CASCADE' })
  institute: Institute;
}
