import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('system_alerts')
export class SystemAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column()
  title: string;

  @CreateDateColumn()
  created_at: Date;
}
