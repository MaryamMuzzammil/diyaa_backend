import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from './permissions.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private repo: Repository<Permission>,
  ) {}

  create(data: Partial<Permission>) {
    const permission = this.repo.create(data);
    return this.repo.save(permission);
  }

  findAll() {
    return this.repo.find();
  }

  async remove(id: number) {
    await this.repo.delete(id);
    return { message: 'Permission deleted' };
  }
}