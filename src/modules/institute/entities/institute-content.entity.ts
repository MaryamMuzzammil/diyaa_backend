import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Institute } from '../institute.entity';

@Entity()
export class InstituteContent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  subject: string;

  @Column()
  type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assigned_to: string | null;

  @ManyToOne(() => Institute, { onDelete: 'CASCADE' })
  institute: Institute;
}
