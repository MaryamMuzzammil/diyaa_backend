import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Institute } from '../institute/institute.entity';
import { User } from '../users/users.entity';

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Institute, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'institute_id' })
  institute: Institute;

  @OneToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 128, default: 'Main Campus' })
  branch: string;

  @Column('simple-array', { nullable: true })
  subjects: string[] | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  qualification: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  employee_id: string | null;

  @CreateDateColumn()
  created_at: Date;
}
