import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('curriculum_versions')
export class CurriculumVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32 })
  version: string;

  @Column({ type: 'date' })
  release_date: string;

  @Column({ type: 'varchar', length: 16, default: 'Draft' })
  status: string;

  @Column({ type: 'text' })
  changes: string;

  @Column({ type: 'int', nullable: true })
  created_by: number | null;

  @CreateDateColumn()
  created_at: Date;
}
