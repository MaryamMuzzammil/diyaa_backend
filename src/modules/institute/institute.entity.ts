import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/users.entity';

@Entity()
export class Institute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32, unique: true, nullable: true })
  school_id: string | null;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  registration_number: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo_file_name: string | null;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column()
  owner_name: string;

  @Column({ unique: true })
  owner_email: string;

  @Column()
  owner_phone: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: false })
  terms_accepted: boolean;

  @Column({ default: false })
  privacy_accepted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => User, (user) => user.institute)
  users: User[];
}
