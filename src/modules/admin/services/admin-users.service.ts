import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentService } from '../../student/student.service';
import { User, UserRole } from '../../users/users.entity';
import { UsersService } from '../../users/users.service';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { paginate } from '../dto/pagination-query.dto';
import { AdminAuditService } from './admin-audit.service';

type Actor = { sub: number; email: string; role: UserRole };

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private usersService: UsersService,
    private studentService: StudentService,
    private audit: AdminAuditService,
  ) {}

  async list(role?: string, status?: string, search?: string, page = 1, limit = 20) {
    let users = await this.userRepo.find({ relations: ['institute'] });

    if (!role) {
      users = users.filter(
        (u) =>
          u.role === UserRole.OWNER ||
          (u.role === UserRole.STUDENT && u.institute_id == null),
      );
    } else {
      users = users.filter(
        (u) => u.role.toLowerCase() === role.toLowerCase().replace(/\s+/g, ''),
      );
    }

    if (status) {
      users = users.filter(
        (u) => u.status.toLowerCase() === status.toLowerCase(),
      );
    }

    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }

    const mapped = users.map((u) => this.toAdminUser(u));
    const paged = paginate(mapped, page, limit);
    return { users: paged.items, pagination: paged.pagination };
  }

  async getById(id: number) {
    const user = await this.userRepo.findOne({
      where: { user_id: id },
      relations: ['institute'],
    });
    if (!user) throw new NotFoundException('User not found');
    return { user: this.toAdminUser(user, true) };
  }

  async update(id: number, body: Partial<CreateUserDto>, actor: Actor) {
    const user = await this.userRepo.findOne({ where: { user_id: id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.SUPERADMIN) {
      throw new BadRequestException('Cannot modify SuperAdmin via admin API');
    }

    if (body.name) user.name = body.name.trim();
    if (body.email) user.email = body.email.trim().toLowerCase();
    if (body.grade) user.grade = body.grade;
    if (body.phone) user.phone = body.phone;
    await this.userRepo.save(user);
    if (user.role === UserRole.STUDENT) {
      await this.studentService.syncFromUser(user);
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'update_user',
      resourceType: 'user',
      resourceId: id,
      metadata: { fields: Object.keys(body) },
    });

    return { user: this.toAdminUser(user, true) };
  }

  async updateStatus(
    id: number,
    status: string,
    actor: Actor,
  ) {
    const user = await this.userRepo.findOne({ where: { user_id: id } });
    if (!user) throw new NotFoundException('User not found');
    user.status = status.toLowerCase();
    await this.userRepo.save(user);
    if (user.role === UserRole.STUDENT) {
      await this.studentService.syncFromUser(user);
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'update_user_status',
      resourceType: 'user',
      resourceId: id,
      metadata: { status },
    });

    return { user: this.toAdminUser(user) };
  }

  async remove(id: number, actor: Actor) {
    const user = await this.userRepo.findOne({ where: { user_id: id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.SUPERADMIN) {
      throw new BadRequestException('Cannot delete SuperAdmin');
    }
    if (user.role === UserRole.STUDENT) {
      await this.studentService.deleteForUser(id);
    }
    await this.userRepo.delete(id);

    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'delete_user',
      resourceType: 'user',
      resourceId: id,
    });

    return { message: 'User deleted' };
  }

  async exportUsers(role?: string) {
    const result = await this.list(role, undefined, undefined, 1, 10000);
    return { users: result.users, exported_at: new Date().toISOString() };
  }

  async createFreeStudent(dto: CreateUserDto, actor: Actor) {
    const result = await this.usersService.create({
      ...dto,
      role: UserRole.STUDENT,
      instituteId: dto.instituteId ?? undefined,
    });
    const user = await this.userRepo.findOne({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (user && user.role === UserRole.STUDENT && user.institute_id == null) {
      await this.studentService.create(user, null, dto as any);
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'create_user',
      resourceType: 'user',
      resourceId: user?.user_id,
      metadata: { role: 'Student', free: true },
    });

    return result;
  }

  private toAdminUser(user: User, detailed = false) {
    const roleLabel =
      user.role === UserRole.OWNER
        ? 'Institute Owner'
        : user.role === UserRole.STUDENT && user.institute_id == null
          ? 'Free Student'
          : user.role === UserRole.ADMIN
            ? 'Principal'
            : user.role;

    const base = {
      id: String(user.user_id),
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: roleLabel,
      status: this.capitalize(user.status),
      last_active: formatLastActive(user.last_active_at),
      institute_id: user.institute_id,
      instituteId: user.institute_id,
      created_at: user.created_at,
    };

    if (!detailed) return base;

    return {
      ...base,
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
      },
    };
  }

  private capitalize(s: string) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
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
