import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Institute } from './institute.entity';

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  plan: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  plan_price: string | null;

  @Column({ type: 'int', default: 7 })
  trial_days: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  billing_name: string | null;

  @Column({ type: 'text', nullable: true })
  billing_address: string | null;

  /** Token from payment gateway — never store raw card or CVV */
  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_method_token: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  payment_last4: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  trial_ends_at: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'date', nullable: true })
  renewal_date: string | null;

  @ManyToOne(() => Institute)
  institute: Institute;
}
