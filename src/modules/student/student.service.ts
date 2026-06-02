import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateInstituteUserDto } from '../institute/dto/create-institute-user.dto';
import { Institute } from '../institute/institute.entity';
import { User } from '../users/users.entity';
import { Student } from './student.entity';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private repo: Repository<Student>,
  ) {}

  async create(
    user: User,
    institute: Institute | null,
    dto: CreateInstituteUserDto,
  ) {
    const instituteId = institute?.id ?? null;
    return this.repo.save(
      this.repo.create({
        user_id: user.user_id,
        user,
        institute_id: instituteId,
        institute: institute ?? null,
        name: user.name,
        email: user.email,
        status: user.status,
        grade: dto.grade ?? user.grade ?? null,
        branch: dto.branch ?? dto.class_or_branch ?? user.branch ?? 'Main Campus',
        avatar_id: dto.avatar_id ?? user.avatar_id ?? 'avatar-default',
        preferred_language:
          dto.preferred_language ?? user.preferred_language ?? 'English',
        daily_goal: dto.daily_goal ?? user.daily_goal ?? '20m',
        signup_method: user.signup_method ?? 'email',
        is_free_student: instituteId == null,
      }),
    );
  }

  async deleteForUser(userId: number) {
    await this.repo.delete({ user_id: userId });
  }

  async syncFromUser(user: User) {
    await this.repo.update(
      { user_id: user.user_id },
      {
        status: user.status,
        name: user.name,
        email: user.email,
        grade: user.grade,
        branch: user.branch ?? 'Main Campus',
        avatar_id: user.avatar_id,
        preferred_language: user.preferred_language,
        daily_goal: user.daily_goal,
      },
    );
  }

  async findByInstituteId(instituteId: number) {
    const rows = await this.repo.find({
      where: { institute_id: instituteId },
      relations: ['user'],
      order: { name: 'ASC' },
    });
    return rows.map((r) => this.toListItem(r));
  }

  async findFree() {
    const rows = await this.repo.find({
      where: { institute_id: IsNull() },
      relations: ['user'],
      order: { name: 'ASC' },
    });
    return rows.map((r) => this.toListItem(r));
  }

  toListItem(record: Student) {
    return {
      ...this.toProfile(record),
      class_or_branch: record.branch,
      last_active: formatLastActive(record.last_login_at),
    };
  }

  toProfile(record: Student) {
    const user = record.user;
    const dob = formatDateOnly(user?.date_of_birth ?? null);
    return {
      id: record.id,
      user_id: record.user_id,
      institute_id: record.institute_id,
      role: 'Student' as const,
      name: record.name,
      email: record.email,
      status: record.status,
      grade: record.grade,
      assigned_class: record.grade,
      assignClass: record.grade,
      branch: record.branch,
      phone: user?.phone ?? null,
      date_of_birth: dob,
      dateOfBirth: dob,
      age: user?.age ?? null,
      gender: user?.gender ?? null,
      permanent_address: user?.permanent_address ?? null,
      permanentAddress: user?.permanent_address ?? null,
      birth_certificate_number: user?.birth_certificate_number ?? null,
      birthCertificateNumber: user?.birth_certificate_number ?? null,
      previous_school: user?.previous_school ?? null,
      previousSchool: user?.previous_school ?? null,
      medical_history: user?.medical_history ?? null,
      medicalHistory: user?.medical_history ?? null,
      financial_aid: user?.financial_aid ?? null,
      financialAid: user?.financial_aid ?? null,
      avatar_id: record.avatar_id,
      avatarId: record.avatar_id,
      preferred_language: record.preferred_language,
      preferredLanguage: record.preferred_language,
      daily_goal: record.daily_goal,
      dailyGoal: record.daily_goal,
      signup_method: record.signup_method,
      is_free_student: record.is_free_student,
      last_login_at: record.last_login_at,
      created_at: record.created_at,
    };
  }

  toPublic(record: Student, instituteId?: number, userId?: number) {
    return this.toProfile({
      ...record,
      institute_id: instituteId ?? record.institute_id,
      user_id: userId ?? record.user_id,
    });
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

function formatDateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}
