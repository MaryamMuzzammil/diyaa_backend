import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Institute } from '../institute/institute.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,
  ) {}
  pick<T extends Record<string, unknown>>(
    data: T,
    keys: string[],
  ): string | undefined {
    for (const k of keys) {
      const v = data[k as keyof T];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v);
      }
    }
    return undefined;
  }

  parseDob(raw?: string): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  toPublicUser(user: User) {
    return {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: {
        date_of_birth: user.date_of_birth,
        age: user.age,
        gender: user.gender,
        phone: user.phone,
        permanent_address: user.permanent_address,
        birth_certificate_number: user.birth_certificate_number,
        previous_school: user.previous_school,
        medical_history: user.medical_history,
        financial_aid: user.financial_aid,
        grade: user.grade,
        preferred_language: user.preferred_language,
        avatar_id: user.avatar_id,
        daily_goal: user.daily_goal,
        signup_method: user.signup_method,
        branch: user.branch,
      },
    };
  }

  async touchLastActive(userId: number) {
    await this.repo.update(userId, { last_active_at: new Date() });
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async findById(userId: number) {
    return this.repo.findOne({
      where: { user_id: userId },
      relations: ['institute'],
    });
  }

  async create(dto: CreateUserDto) {
    const confirm =
      dto.confirm_password ?? dto.confirmPassword ?? undefined;
    if (confirm !== undefined && confirm !== dto.password) {
      throw new BadRequestException('Password and confirm password do not match');
    }

    const name =
      this.pick(dto as any, ['name', 'full_name', 'fullName']) ?? '';
    if (!name.trim()) {
      throw new BadRequestException('name (or full_name) is required');
    }

    if (dto.role === UserRole.SUPERADMIN) {
      throw new BadRequestException(
        'SuperAdmin accounts cannot be created via the API',
      );
    }

    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    let institute: Institute | undefined;
    if (dto.instituteId != null) {
      const found = await this.instituteRepo.findOne({
        where: { id: dto.instituteId },
      });
      if (!found) {
        throw new BadRequestException('instituteId not found');
      }
      institute = found;
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const user = this.repo.create({
      name: name.trim(),
      email: dto.email.trim().toLowerCase(),
      password_hash: hash,
      role: dto.role ?? UserRole.STUDENT,
      status: 'active',
      date_of_birth: this.parseDob(
        this.pick(dto as any, ['date_of_birth', 'dateOfBirth']),
      ),
      age: dto.age ?? null,
      gender: this.pick(dto as any, ['gender']) ?? null,
      phone: this.pick(dto as any, ['phone']) ?? null,
      permanent_address:
        this.pick(dto as any, ['permanent_address', 'permanentAddress']) ??
        null,
      birth_certificate_number:
        this.pick(dto as any, [
          'birth_certificate_number',
          'birthCertificateNumber',
        ]) ?? null,
      previous_school:
        this.pick(dto as any, ['previous_school', 'previousSchool']) ?? null,
      medical_history:
        this.pick(dto as any, ['medical_history', 'medicalHistory']) ?? null,
      financial_aid:
        this.pick(dto as any, ['financial_aid', 'financialAid']) ?? null,
      grade: this.pick(dto as any, ['grade']) ?? null,
      preferred_language:
        this.pick(dto as any, ['preferred_language', 'preferredLanguage']) ??
        null,
      avatar_id: this.pick(dto as any, ['avatar_id', 'avatarId']) ?? null,
      daily_goal: this.pick(dto as any, ['daily_goal', 'dailyGoal']) ?? null,
      signup_method:
        this.pick(dto as any, ['signup_method', 'signupMethod']) ?? null,
      ...(institute ? { institute } : {}),
    });

    const saved = await this.repo.save(user);
    return {
      message: 'Account created successfully',
      user: this.toPublicUser(saved),
    };
  }

  async findAll() {
    const users = await this.repo.find();
    return users.map((u) => this.toPublicUser(u));
  }
}
