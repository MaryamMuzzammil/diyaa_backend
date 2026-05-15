import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Institute } from '../institute.entity';

@Entity()
export class BillingInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  invoice: string;

  @Column({ type: 'date' })
  invoice_date: string;

  @Column()
  amount: string;

  @Column({ default: 'Paid' })
  status: string;

  @ManyToOne(() => Institute, { onDelete: 'CASCADE' })
  institute: Institute;
}
