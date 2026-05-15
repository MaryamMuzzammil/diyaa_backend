import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Institute } from './institute.entity';

@Entity()
export class AcademicConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('simple-array', { default: '' })
  grades: string[];

  @Column()
  students_range: string;

  @Column()
  teachers_count: string;

  @ManyToOne(() => Institute)
  institute: Institute;
}
