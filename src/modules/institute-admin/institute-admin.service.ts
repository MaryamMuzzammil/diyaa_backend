import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInstituteUserDto } from '../institute/dto/create-institute-user.dto';
import { Institute } from '../institute/institute.entity';
import { User } from '../users/users.entity';
import { InstituteAdmin } from './institute-admin.entity';

@Injectable()
export class InstituteAdminService {
  constructor(
    @InjectRepository(InstituteAdmin)
    private repo: Repository<InstituteAdmin>,
  ) {}

  async create(user: User, institute: Institute, dto: CreateInstituteUserDto) {
    return this.repo.save(
      this.repo.create({
        institute,
        user,
        name: user.name,
        email: user.email,
        status: user.status,
        phone: dto.phone ?? user.phone ?? null,
        designation: dto.designation ?? null,
        department: dto.department ?? null,
      }),
    );
  }

  async deleteForUser(userId: number) {
    await this.repo.delete({ user: { user_id: userId } });
  }

  async syncFromUser(user: User) {
    await this.repo.update(
      { user: { user_id: user.user_id } },
      { status: user.status, name: user.name, email: user.email },
    );
  }

  toPublic(record: InstituteAdmin, instituteId?: number, userId?: number) {
    return {
      id: record.id,
      institute_id: instituteId ?? record.institute?.id,
      user_id: userId ?? record.user?.user_id,
      role: 'Admin' as const,
      name: record.name,
      email: record.email,
      status: record.status,
      phone: record.phone,
      designation: record.designation,
      department: record.department,
      created_at: record.created_at,
    };
  }
}
