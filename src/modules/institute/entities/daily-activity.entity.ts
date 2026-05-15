import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Institute } from '../institute.entity';

@Entity()
export class DailyActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 8 })
  day: string;

  @Column({ type: 'int', default: 0 })
  active: number;

  @Column({ type: 'int', default: 0 })
  lessons: number;

  @Column({ type: 'int', default: 0 })
  games: number;

  @ManyToOne(() => Institute, { onDelete: 'CASCADE' })
  institute: Institute;
}
