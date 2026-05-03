import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Institute } from './institute.entity';

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  plan: string; // free, basic, premium

  @ManyToOne(() => Institute)
  institute: Institute;
}