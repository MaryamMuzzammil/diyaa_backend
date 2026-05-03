import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './users.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  async create(data: any) {
    // 🔐 password hash
    const hash = await bcrypt.hash(data.password, 10);

    const user = this.repo.create({
      name: data.name,
      email: data.email,
      password_hash: hash, // ✅ DB field
      role: data.role ?? UserRole.STUDENT, // ✅ default role
      status: 'active', // optional (already default in entity)
    });

    return this.repo.save(user);
  }

  findAll() {
    return this.repo.find();
  }
}