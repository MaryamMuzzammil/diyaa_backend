import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('platform_games')
export class PlatformGame {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 64 })
  subject: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  grade: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({ type: 'int', default: 0 })
  plays: number;

  @Column({ type: 'int', default: 0 })
  average_score: number;

  @Column({ type: 'int', default: 0 })
  completion_rate: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
