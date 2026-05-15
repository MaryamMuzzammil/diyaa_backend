import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Institute } from '../institute.entity';

@Entity()
export class SubjectMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  subject: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'int' })
  engagement: number;

  @ManyToOne(() => Institute, { onDelete: 'CASCADE' })
  institute: Institute;
}
