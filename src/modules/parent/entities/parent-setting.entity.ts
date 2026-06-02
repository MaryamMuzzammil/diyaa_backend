import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Parent } from '../parent.entity';

@Entity('parent_settings')
export class ParentSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Parent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Parent;

  @Column({ default: true })
  progress_notifications: boolean;

  @Column({ default: true })
  weekly_reports: boolean;

  @Column({ default: true })
  safety_alerts: boolean;

  @Column({ type: 'varchar', length: 32, default: 'en' })
  language: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  email: string | null;

  @UpdateDateColumn()
  updated_at: Date;
}
