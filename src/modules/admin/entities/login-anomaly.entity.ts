import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('login_anomalies')
export class LoginAnomaly {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_email: string;

  @Column({ type: 'varchar', length: 64 })
  anomaly_type: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
