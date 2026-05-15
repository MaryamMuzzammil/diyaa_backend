import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Institute } from '../institute.entity';

@Entity()
export class EngagementInsight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  message: string;

  @ManyToOne(() => Institute, { onDelete: 'CASCADE' })
  institute: Institute;
}
