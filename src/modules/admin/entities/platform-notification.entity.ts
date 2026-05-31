import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('platform_notifications')
export class PlatformNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ default: false })
  read: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  link: string | null;

  @CreateDateColumn()
  created_at: Date;
}
