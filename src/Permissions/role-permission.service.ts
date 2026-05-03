import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RolePermission } from './role-permission.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolePermissionService {
  constructor(
    @InjectRepository(RolePermission)
    private repo: Repository<RolePermission>,
  ) {}

  // assign permission to role
  create(data: Partial<RolePermission>) {
    const rp = this.repo.create(data);
    return this.repo.save(rp);
  }

  findAll() {
    return this.repo.find({
      relations: ['role', 'permission'],
    });
  }

  async remove(id: number) {
    await this.repo.delete(id);
    return { message: 'RolePermission deleted' };
  }
}