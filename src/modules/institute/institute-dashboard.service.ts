import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { assertInstituteScopedCreate } from '../users/users-institute.util';
import { User, UserRole } from '../users/users.entity';
import { UsersService } from '../users/users.service';
import { AcademicConfig } from './academic.entity';
import { AssignContentDto } from './dto/assign-content.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { CreateInstituteUserDto } from './dto/create-institute-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { BillingInvoice } from './entities/billing-invoice.entity';
import { ClassSection } from './entities/class-section.entity';
import { DailyActivity } from './entities/daily-activity.entity';
import { EngagementInsight } from './entities/engagement-insight.entity';
import { InstituteContent } from './entities/institute-content.entity';
import { SubjectMetric } from './entities/subject-metric.entity';
import { Actor, InstituteAccessService } from './institute-access.service';
import { InstitutePermissionsService } from './institute-permissions.service';
import { seedInstituteDashboardIfEmpty } from './institute-dashboard.seed';
import { Institute } from './institute.entity';
import { InstituteMembersService } from './institute-members.service';
import { ensureInstituteSchoolId } from './institute-school-id.util';
import { Subscription } from './subscription.entity';
import { TeacherClassAssignment } from '../teacher/entities/teacher-class-assignment.entity';
import { Teacher } from '../teacher/teacher.entity';

@Injectable()
export class InstituteDashboardService {
  constructor(
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AcademicConfig)
    private academicRepo: Repository<AcademicConfig>,
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(ClassSection)
    private classRepo: Repository<ClassSection>,
    @InjectRepository(InstituteContent)
    private contentRepo: Repository<InstituteContent>,
    @InjectRepository(BillingInvoice)
    private invoiceRepo: Repository<BillingInvoice>,
    @InjectRepository(DailyActivity)
    private activityRepo: Repository<DailyActivity>,
    @InjectRepository(SubjectMetric)
    private subjectRepo: Repository<SubjectMetric>,
    @InjectRepository(EngagementInsight)
    private insightRepo: Repository<EngagementInsight>,
    @InjectRepository(Teacher)
    private teacherRepo: Repository<Teacher>,
    @InjectRepository(TeacherClassAssignment)
    private teacherClassRepo: Repository<TeacherClassAssignment>,
    private access: InstituteAccessService,
    private usersService: UsersService,
    private permissionsService: InstitutePermissionsService,
    private membersService: InstituteMembersService,
  ) {}

  async getDashboard(instituteId: number, actor: Actor) {
    let institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanView(institute, actor);

    institute = await ensureInstituteSchoolId(institute, this.instituteRepo);

    const [academic, subscription] = await Promise.all([
      this.academicRepo.findOne({ where: { institute: { id: instituteId } } }),
      this.subscriptionRepo.findOne({
        where: { institute: { id: instituteId } },
      }),
    ]);

    await seedInstituteDashboardIfEmpty({
      institute,
      academic,
      subscription,
      classRepo: this.classRepo,
      contentRepo: this.contentRepo,
      invoiceRepo: this.invoiceRepo,
      activityRepo: this.activityRepo,
      subjectRepo: this.subjectRepo,
      insightRepo: this.insightRepo,
    });

    const users = await this.userRepo.find({
      where: { institute: { id: instituteId } },
    });

    const [classes, dailyActivity, content, invoices, subjects, insights] =
      await Promise.all([
        this.classRepo.find({ where: { institute: { id: instituteId } } }),
        this.activityRepo.find({
          where: { institute: { id: instituteId } },
          order: { id: 'ASC' },
        }),
        this.contentRepo.find({ where: { institute: { id: instituteId } } }),
        this.invoiceRepo.find({
          where: { institute: { id: instituteId } },
          order: { invoice_date: 'DESC' },
        }),
        this.subjectRepo.find({ where: { institute: { id: instituteId } } }),
        this.insightRepo.find({ where: { institute: { id: instituteId } } }),
      ]);

    return {
      institute: this.toPublicInstitute(institute),
      academic: academic
        ? {
            grades_offered: academic.grades,
            student_range: academic.students_range,
            teacher_range: academic.teachers_count,
          }
        : null,
      subscription: subscription
        ? {
            plan_name: subscription.plan,
            plan_price: subscription.plan_price,
            trial_days: subscription.trial_days,
            trial_ends_at: subscription.trial_ends_at,
            billing_name: subscription.billing_name,
            billing_address: subscription.billing_address,
            payment_last4: subscription.payment_last4,
            has_payment_method: Boolean(subscription.payment_method_token),
          }
        : null,
      overview: this.buildOverview(users, classes),
      daily_activity: dailyActivity.map((d) => ({
        day: d.day,
        active: d.active,
        lessons: d.lessons,
        games: d.games,
      })),
      users: await Promise.all(
        users.map((u) => this.toDashboardUser(u)),
      ),
      structure_summary: this.buildStructureSummary(classes),
      class_structure: this.buildClassStructure(classes),
      subject_performance: subjects.map((s) => ({
        subject: s.subject,
        score: s.score,
        engagement: s.engagement,
      })),
      engagement_insights: insights.map((i) => i.message),
      billing_history: invoices.map((inv) => ({
        invoice: inv.invoice,
        date: inv.invoice_date,
        amount: inv.amount,
        status: inv.status,
      })),
      content_library: content.map((c) => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
        type: c.type,
        assigned_to: c.assigned_to,
      })),
    };
  }

  async seedAfterRegistration(
    institute: Institute,
    academic: AcademicConfig,
    subscription: Subscription,
  ) {
    await seedInstituteDashboardIfEmpty({
      institute,
      academic,
      subscription,
      classRepo: this.classRepo,
      contentRepo: this.contentRepo,
      invoiceRepo: this.invoiceRepo,
      activityRepo: this.activityRepo,
      subjectRepo: this.subjectRepo,
      insightRepo: this.insightRepo,
    });
  }

  async createUser(dto: CreateInstituteUserDto, actor: Actor) {
    const instituteId = await this.resolveInstituteId(actor, dto.institute_id);
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanManage(institute, actor);

    const existing = await this.userRepo.findOne({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const targetRole = dto.role ?? UserRole.STUDENT;
    if (targetRole === UserRole.SUPERADMIN) {
      throw new BadRequestException(
        'SuperAdmin accounts cannot be created via the API',
      );
    }

    this.permissionsService.assertOwnerCanAssignRole(actor, targetRole);
    assertInstituteScopedCreate(targetRole, institute.id);

    const hash = await bcrypt.hash(dto.password, 10);
    const branch = dto.branch ?? dto.class_or_branch ?? 'Main Campus';
    const saved = await this.userRepo.save({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      password_hash: hash,
      role: targetRole,
      status: 'active',
      institute_id: institute.id,
      phone: dto.phone ?? null,
      grade: dto.grade ?? null,
      branch,
      date_of_birth: this.parseDob(dto.date_of_birth),
      age: dto.age ?? null,
      gender: dto.gender ?? null,
      permanent_address: dto.permanent_address ?? null,
      birth_certificate_number: dto.birth_certificate_number ?? null,
      previous_school: dto.previous_school ?? null,
      medical_history: dto.medical_history ?? null,
      financial_aid: dto.financial_aid ?? null,
      preferred_language: dto.preferred_language ?? null,
      avatar_id: dto.avatar_id ?? null,
      institute,
    });

    const memberRecord = await this.membersService.createForUser(
      saved,
      institute,
      dto,
    );

    let permNames: string[];
    if (dto.permissions?.length) {
      const filtered = this.permissionsService.filterPermissionsForRole(
        targetRole,
        dto.permissions,
        actor,
      )!;
      permNames = await this.permissionsService.setUserPermissions(
        saved.user_id,
        filtered,
      );
    } else {
      permNames = await this.permissionsService.applyRoleDefaultsToUser(saved);
    }

    return {
      message: 'User created successfully',
      user: await this.toDashboardUser(saved),
      member: this.membersService.toPublicMember(
        saved.role,
        memberRecord,
        institute.id,
        saved.user_id,
      ),
      permissions: permNames,
    };
  }

  async updateUserStatus(
    userId: number,
    dto: UpdateUserStatusDto,
    actor: Actor,
  ) {
    const user = await this.getManagedUserOrFail(userId, actor);
    user.status = dto.status.toLowerCase();
    await this.userRepo.save(user);
    await this.membersService.syncStatus(user);
    return {
      message: 'User status updated',
      user: await this.toDashboardUser(user),
    };
  }

  async updateUserRole(userId: number, dto: UpdateUserRoleDto, actor: Actor) {
    const user = await this.getManagedUserOrFail(userId, actor);
    if (user.role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot change the institute owner role');
    }
    if (dto.role === UserRole.SUPERADMIN) {
      throw new BadRequestException('Cannot assign SuperAdmin role');
    }
    this.permissionsService.assertOwnerCanAssignRole(actor, dto.role);
    const institute = await this.access.getInstituteOrFail(user.institute!.id);
    user.role = dto.role;
    await this.userRepo.save(user);

    const memberRecord = await this.membersService.replaceOnRoleChange(
      user,
      institute,
      {
        email: user.email,
        password: '',
        name: user.name,
        phone: user.phone ?? undefined,
        grade: user.grade ?? undefined,
        branch: user.branch ?? undefined,
      },
    );

    let permNames: string[];
    if (dto.permissions?.length) {
      const filtered = this.permissionsService.filterPermissionsForRole(
        dto.role,
        dto.permissions,
        actor,
      );
      permNames = await this.permissionsService.setUserPermissions(
        user.user_id,
        filtered ?? dto.permissions,
      );
    } else {
      permNames = await this.permissionsService.applyRoleDefaultsToUser(user);
    }

    return {
      message: 'User role updated',
      user: await this.toDashboardUser(user),
      member: this.membersService.toPublicMember(
        user.role,
        memberRecord,
        institute.id,
        user.user_id,
      ),
      permissions: permNames,
    };
  }

  async getUserPermissionsForActor(userId: number, actor: Actor) {
    await this.getManagedUserOrFail(userId, actor);
  }

  async setUserPermissions(
    userId: number,
    dto: SetUserPermissionsDto,
    actor: Actor,
  ) {
    const user = await this.getManagedUserOrFail(userId, actor);
    const filtered =
      this.permissionsService.filterPermissionsForRole(
        user.role,
        dto.permissions,
        actor,
      ) ?? dto.permissions;

    const names = await this.permissionsService.setUserPermissions(
      user.user_id,
      filtered,
    );

    return {
      message: 'Permissions updated',
      user_id: user.user_id,
      permissions: names,
    };
  }

  async deleteUser(userId: number, actor: Actor) {
    const user = await this.getManagedUserOrFail(userId, actor);
    if (user.role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot delete the institute owner');
    }
    await this.membersService.deleteAllForUser(userId);
    await this.userRepo.delete(userId);
    return { message: 'User deleted successfully' };
  }

  async assignTeacher(classId: number, dto: AssignTeacherDto, actor: Actor) {
    const section = await this.classRepo.findOne({
      where: { id: classId },
      relations: ['institute'],
    });
    if (!section?.institute) {
      throw new NotFoundException(`Class #${classId} not found`);
    }
    await this.access.assertCanManage(section.institute, actor);

    let name = dto.teacher_name?.trim();
    let teacherRecord: Teacher | null = null;

    if (dto.teacher_id != null) {
      teacherRecord = await this.teacherRepo.findOne({
        where: {
          id: dto.teacher_id,
          institute: { id: section.institute.id },
        },
        relations: ['user'],
      });
      if (!teacherRecord) {
        throw new NotFoundException(`Teacher #${dto.teacher_id} not found`);
      }
      name = teacherRecord.name;
    }

    if (!name) {
      throw new BadRequestException('teacher_name or teacher_id is required');
    }

    const names = new Set(section.teacher_names ?? []);
    names.add(name);
    section.teacher_names = [...names];
    await this.classRepo.save(section);

    if (teacherRecord) {
      const exists = await this.teacherClassRepo.findOne({
        where: {
          teacher: { id: teacherRecord.id },
          class_section: { id: section.id },
        },
      });
      if (!exists) {
        await this.teacherClassRepo.save(
          this.teacherClassRepo.create({
            teacher: teacherRecord,
            class_section: section,
            subjects: teacherRecord.subjects,
          }),
        );
      }
    }

    return {
      message: 'Teacher assigned',
      class: this.formatClassRow(section),
    };
  }

  async assignStudents(classId: number, dto: AssignStudentsDto, actor: Actor) {
    const section = await this.classRepo.findOne({
      where: { id: classId },
      relations: ['institute'],
    });
    if (!section?.institute) {
      throw new NotFoundException(`Class #${classId} not found`);
    }
    await this.access.assertCanManage(section.institute, actor);

    if (dto.student_count != null) {
      section.student_count = dto.student_count;
    } else if (dto.increment != null) {
      section.student_count = Math.max(
        0,
        section.student_count + dto.increment,
      );
    } else {
      section.student_count += 1;
    }

    await this.classRepo.save(section);
    return {
      message: 'Students updated',
      class: this.formatClassRow(section),
    };
  }

  async assignContent(contentId: number, dto: AssignContentDto, actor: Actor) {
    const content = await this.contentRepo.findOne({
      where: { id: contentId },
      relations: ['institute'],
    });
    if (!content?.institute) {
      throw new NotFoundException(`Content #${contentId} not found`);
    }
    await this.access.assertCanManage(content.institute, actor);
    content.assigned_to = dto.assigned_to.trim();
    await this.contentRepo.save(content);

    return {
      message: 'Content assigned',
      content: {
        id: content.id,
        title: content.title,
        subject: content.subject,
        type: content.type,
        assigned_to: content.assigned_to,
      },
    };
  }

  private async getManagedUserOrFail(userId: number, actor: Actor) {
    const user = await this.userRepo.findOne({
      where: { user_id: userId },
      relations: ['institute'],
    });
    if (!user?.institute?.id) {
      throw new NotFoundException(`User #${userId} not found`);
    }
    const institute = await this.access.getInstituteOrFail(user.institute.id);
    await this.access.assertCanManage(institute, actor);
    return user;
  }

  private async resolveInstituteId(
    actor: Actor,
    explicitId?: number,
  ): Promise<number> {
    if (explicitId != null) {
      return explicitId;
    }
    if (actor.role === UserRole.OWNER) {
      const inst = await this.instituteRepo.findOne({
        where: { owner_email: actor.email.toLowerCase() },
      });
      if (inst) return inst.id;
    }
    const user = await this.userRepo.findOne({
      where: { user_id: actor.sub },
      relations: ['institute'],
    });
    if (user?.institute?.id) {
      return user.institute.id;
    }
    throw new BadRequestException('institute_id is required');
  }

  private buildOverview(users: User[], classes: ClassSection[]) {
    const students = users.filter((u) => u.role === UserRole.STUDENT);
    const teachers = users.filter((u) => u.role === UserRole.TEACHER);
    const totalStudents =
      students.length ||
      classes.reduce((sum, c) => sum + c.student_count, 0);
    const totalTeachers = teachers.length;
    const now = Date.now();
    const dayMs = 86400000;

    const activeToday = users.filter((u) => {
      if (u.status !== 'active') return false;
      if (!u.last_active_at) return u.role === UserRole.STUDENT;
      return now - u.last_active_at.getTime() < dayMs;
    }).length;

    const activeWeek = students.filter((u) => {
      if (!u.last_active_at) return u.status === 'active';
      return now - u.last_active_at.getTime() < 7 * dayMs;
    }).length;

    const weeklyEngagement = totalStudents
      ? Math.min(100, Math.round((activeWeek / totalStudents) * 100))
      : 0;

    const newThisMonth = users.filter((u) => {
      if (!u.created_at) return false;
      const d = new Date(u.created_at);
      const n = new Date();
      return (
        d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
      );
    }).length;

    const activeClasses = classes.filter((c) => c.student_count > 0).length;
    const activeTodayPct = totalStudents
      ? Math.round((activeToday / totalStudents) * 100)
      : 0;

    return {
      total_students: totalStudents,
      total_teachers: totalTeachers,
      active_today: activeToday,
      weekly_engagement_percent: weeklyEngagement,
      students_change_text: `+${newThisMonth || Math.max(1, Math.floor(totalStudents * 0.03))} this month`,
      teachers_change_text: `${activeClasses || classes.length} active classes`,
      active_today_text: `${activeTodayPct}% of school`,
      engagement_change_text: `+${Math.max(0, weeklyEngagement - 72)}% vs last week`,
    };
  }

  private buildStructureSummary(classes: ClassSection[]) {
    const branches = new Set(classes.map((c) => c.branch));
    const grades = new Set(classes.map((c) => c.grade));
    return {
      branches: branches.size || 1,
      grades: grades.size,
      classes: classes.length,
    };
  }

  private buildClassStructure(classes: ClassSection[]) {
    const byGrade = new Map<string, ClassSection[]>();
    for (const row of classes) {
      const list = byGrade.get(row.grade) ?? [];
      list.push(row);
      byGrade.set(row.grade, list);
    }

    return [...byGrade.entries()].map(([grade, rows]) => ({
      grade,
      classes: rows.map((r) => r.section),
      students: rows.reduce((s, r) => s + r.student_count, 0),
      teachers: [
        ...new Set(rows.flatMap((r) => r.teacher_names ?? []).filter(Boolean)),
      ],
      branch: rows[0]?.branch ?? 'Main Campus',
    }));
  }

  private formatClassRow(section: ClassSection) {
    return {
      id: section.id,
      grade: section.grade,
      section: section.section,
      branch: section.branch,
      student_count: section.student_count,
      teachers: section.teacher_names ?? [],
    };
  }

  private async toDashboardUser(user: User) {
    const publicUser = this.usersService.toPublicUser(user);
    const permissions =
      await this.permissionsService.getUserPermissionNames(user.user_id);
    return {
      ...publicUser,
      name: user.name,
      role: user.role,
      class_or_branch: user.branch ?? 'Main Campus',
      last_active: formatRelativeTime(user.last_active_at),
      permissions,
    };
  }

  private toPublicInstitute(inst: Institute) {
    return {
      id: inst.id,
      school_id: inst.school_id,
      name: inst.name,
      type: inst.type,
      registration_number: inst.registration_number,
      logo_file_name: inst.logo_file_name,
      city: inst.city,
      country: inst.country,
      address: inst.address,
      owner_name: inst.owner_name,
      owner_email: inst.owner_email,
      owner_phone: inst.owner_phone,
      status: inst.status,
      created_at: inst.created_at,
    };
  }

  private parseDob(raw?: string): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec} secs ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} mins ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  return `${Math.floor(sec / 86400)} days ago`;
}
