import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInstituteUserDto } from '../institute/dto/create-institute-user.dto';
import { Institute } from '../institute/institute.entity';
import { User } from '../users/users.entity';
import { Teacher } from './teacher.entity';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher)
    private repo: Repository<Teacher>,
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
        branch: dto.branch ?? dto.class_or_branch ?? user.branch ?? 'Main Campus',
        subjects: dto.subjects?.length ? dto.subjects : null,
        qualification: dto.qualification ?? null,
        employee_id: dto.employee_id ?? null,
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

  async findByInstituteId(instituteId: number) {
    const rows = await this.repo.find({
      where: { institute: { id: instituteId } },
      relations: ['user', 'institute'],
      order: { name: 'ASC' },
    });
    return rows.map((r) => this.toListItem(r));
  }

  toListItem(record: Teacher) {
    return {
      ...this.toPublic(record),
      class_or_branch: record.branch,
      last_active: formatLastActive(record.user?.last_active_at ?? null),
    };
  }

  toPublic(record: Teacher, instituteId?: number, userId?: number) {
    return {
      id: record.id,
      institute_id: instituteId ?? record.institute?.id,
      user_id: userId ?? record.user?.user_id,
      role: 'Teacher' as const,
      name: record.name,
      email: record.email,
      status: record.status,
      branch: record.branch,
      phone: record.phone,
      subjects: record.subjects,
      qualification: record.qualification,
      employee_id: record.employee_id,
      created_at: record.created_at,
    };
  }
}

function formatLastActive(date: Date | null): string {
  if (!date) return 'Never';
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec} secs ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} mins ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  return `${Math.floor(sec / 86400)} days ago`;
}
