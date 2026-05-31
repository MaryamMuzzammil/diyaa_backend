import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('moderation_items')
export class ModerationItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column({ type: 'varchar', length: 16, default: 'Medium' })
  risk_level: string;

  @Column({ type: 'varchar', length: 32, default: 'AI' })
  flagged_by: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  raw_content_url: string | null;

  @Column({ type: 'int', nullable: true })
  moderator_id: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  moderated_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
