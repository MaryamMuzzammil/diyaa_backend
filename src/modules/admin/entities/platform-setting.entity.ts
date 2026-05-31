import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('platform_settings')
export class PlatformSetting {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 128 })
  label: string;

  @Column({ type: 'varchar', length: 64 })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  value: string | null;

  @Column({ type: 'int', nullable: true })
  updated_by: number | null;

  @UpdateDateColumn()
  updated_at: Date;
}
