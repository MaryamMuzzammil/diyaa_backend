import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('platform_content_items')
export class PlatformContent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'varchar', length: 16, default: 'Pending' })
  status: string;

  @Column({ type: 'int', nullable: true })
  submitted_by_id: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  submitted_by_name: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  submitted_by_role: string | null;

  @Column({ type: 'int', nullable: true })
  institute_id: number | null;

  @Column({ type: 'int', nullable: true })
  reviewed_by_id: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @CreateDateColumn()
  submitted_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
