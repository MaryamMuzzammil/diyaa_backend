import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './roles.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private repo: Repository<Role>,
  ) {}

  // ✅ CREATE
  create(data: Partial<Role>) {
    const role = this.repo.create(data);
    return this.repo.save(role);
  }

  // ✅ GET ALL
  findAll() {
    return this.repo.find();
  }

  // ✅ DELETE
  async remove(id: number) {
    await this.repo.delete(id);
    return { message: 'Role deleted successfully' };
  }
}