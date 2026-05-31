import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 128 })
  user_name: string;

  @Column({ type: 'varchar', length: 32 })
  user_role: string;

  @Column({ name: 'institute_id', type: 'int', nullable: true })
  institute_id: number | null;

  /** Role profile id: students.id, teachers.id, parents.id, institute_admins.id */
  @Column({ name: 'profile_id', type: 'int', nullable: true })
  profile_id: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  profile_type: string | null;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'varchar', length: 32 })
  source: string;

  @Column({ type: 'float', nullable: true })
  confidence: number | null;

  @CreateDateColumn()
  created_at: Date;
}
