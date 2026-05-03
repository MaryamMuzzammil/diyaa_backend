import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../users/users.entity';

@Entity()
export class Institute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  type: string; // school, academy, tuition

  @Column()
  city: string;

  @Column()
  country: string;

  @Column()
  owner_name: string;

  @Column({ unique: true })
  owner_email: string;

  @Column()
  owner_phone: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => User, (user) => user.institute)
  users: User[];
}