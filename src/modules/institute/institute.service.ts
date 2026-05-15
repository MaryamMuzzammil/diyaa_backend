import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { User, UserRole } from '../users/users.entity';
import { UsersService } from '../users/users.service';
import { RegisterInstituteDto } from './dto/register-institute.dto';
import { AcademicConfig } from './academic.entity';
import { Institute } from './institute.entity';
import {
  normalizeInstituteRegistration,
  NormalizedInstituteRegistration,
} from './institute-registration.mapper';
import { Subscription } from './subscription.entity';
import { InstituteDashboardService } from './institute-dashboard.service';
import { generateNextSchoolId } from './institute-school-id.util';

@Injectable()
export class InstituteService {
  constructor(
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(AcademicConfig)
    private academicRepo: Repository<AcademicConfig>,

    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,

    private usersService: UsersService,
    private authService: AuthService,
    private dashboardService: InstituteDashboardService,
  ) {}

  private withPublicUsers(rows: Institute[]) {
    return rows.map((inst) => ({
      ...inst,
      users: inst.users?.map((u) => this.usersService.toPublicUser(u)),
    }));
  }

  async findAllForActor(actor: {
    sub: number;
    email: string;
    role: UserRole;
  }) {
    const relations = ['users'] as const;
    let rows: Institute[];

    if (
      actor.role === UserRole.SUPERADMIN ||
      actor.role === UserRole.ADMIN
    ) {
      rows = await this.instituteRepo.find({ relations: [...relations] });
    } else if (actor.role === UserRole.OWNER) {
      rows = await this.instituteRepo.find({
        where: { owner_email: actor.email.toLowerCase() },
        relations: [...relations],
      });
    } else {
      const user = await this.userRepo.findOne({
        where: { user_id: actor.sub },
        relations: ['institute'],
      });

      if (!user?.institute?.id) {
        return [];
      }

      const inst = await this.instituteRepo.findOne({
        where: { id: user.institute.id },
        relations: [...relations],
      });
      rows = inst ? [inst] : [];
    }

    return this.withPublicUsers(rows);
  }

  async findAllWithDetails(actor: {
    sub: number;
    email: string;
    role: UserRole;
  }) {
    if (
      actor.role !== UserRole.SUPERADMIN &&
      actor.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only SuperAdmin or Admin can list all institutes with details',
      );
    }

    const institutes = await this.instituteRepo.find({
      relations: ['users'],
      order: { id: 'ASC' },
    });

    const [academics, subscriptions] = await Promise.all([
      this.academicRepo.find({ relations: ['institute'] }),
      this.subscriptionRepo.find({ relations: ['institute'] }),
    ]);

    const academicByInstitute = new Map(
      academics.map((a) => [a.institute?.id, a]),
    );
    const subscriptionByInstitute = new Map(
      subscriptions.map((s) => [s.institute?.id, s]),
    );

    const items = institutes.map((institute) => {
      const detail = this.toRegistrationDetail(
        institute,
        academicByInstitute.get(institute.id) ?? null,
        subscriptionByInstitute.get(institute.id) ?? null,
      );

      const users = institute.users ?? [];
      return {
        ...detail,
        user_counts: {
          total: users.length,
          students: users.filter((u) => u.role === UserRole.STUDENT).length,
          teachers: users.filter((u) => u.role === UserRole.TEACHER).length,
          admins: users.filter((u) => u.role === UserRole.ADMIN).length,
          owners: users.filter((u) => u.role === UserRole.OWNER).length,
        },
      };
    });

    return {
      total: items.length,
      institutes: items,
    };
  }

  async findRegistrationById(
    id: number,
    actor: { sub: number; email: string; role: UserRole },
  ) {
    const institute = await this.instituteRepo.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!institute) {
      throw new NotFoundException(`Institute registration #${id} not found`);
    }

    this.assertActorCanAccessInstitute(institute, actor);

    const academic = await this.academicRepo.findOne({
      where: { institute: { id } },
    });

    const subscription = await this.subscriptionRepo.findOne({
      where: { institute: { id } },
    });

    return this.toRegistrationDetail(institute, academic, subscription);
  }

  async deleteRegistration(
    id: number,
    actor: { sub: number; email: string; role: UserRole },
  ) {
    const institute = await this.instituteRepo.findOne({ where: { id } });

    if (!institute) {
      throw new NotFoundException(`Institute registration #${id} not found`);
    }

    this.assertActorCanDeleteInstitute(institute, actor);

    await this.userRepo.delete({ institute: { id } });
    await this.academicRepo.delete({ institute: { id } });
    await this.subscriptionRepo.delete({ institute: { id } });
    await this.instituteRepo.delete(id);

    return {
      message: `Institute registration #${id} deleted successfully`,
    };
  }

  async register(dto: RegisterInstituteDto) {
    const data = normalizeInstituteRegistration(dto);
    await this.assertEmailsAvailable(data);

    const school_id = await generateNextSchoolId(this.instituteRepo);

    const institute = await this.instituteRepo.save({
      school_id,
      name: data.instituteName,
      type: data.instituteType,
      registration_number: data.registrationNumber,
      logo_file_name: data.logoFileName,
      city: data.city,
      country: data.country,
      address: data.address,
      owner_name: data.ownerFullName,
      owner_email: data.ownerEmail,
      owner_phone: data.ownerPhone,
      terms_accepted: data.acceptTerms,
      privacy_accepted: data.acceptPrivacy,
    });

    const ownerHash = await bcrypt.hash(data.password, 10);
    const owner = await this.userRepo.save({
      name: data.ownerFullName,
      email: data.ownerEmail,
      password_hash: ownerHash,
      role: UserRole.OWNER,
      phone: data.ownerPhone !== 'N/A' ? data.ownerPhone : null,
      institute,
      status: 'active',
    });

    const academic = await this.academicRepo.save({
      institute,
      grades: data.gradesOffered,
      students_range: data.studentRange,
      teachers_count: data.teacherRange,
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + data.trialDays);

    const subscription = await this.subscriptionRepo.save({
      institute,
      plan: data.planName,
      plan_price: data.planPrice,
      trial_days: data.trialDays,
      billing_name: data.billingName,
      billing_address: data.billingAddress,
      payment_method_token: data.paymentMethodToken,
      payment_last4: data.paymentLast4,
      trial_ends_at: trialEndsAt,
    });

    let principal: User | null = null;
    let principalActivationRequired = false;

    if (data.createPrincipal && data.principalEmail) {
      const principalPassword =
        data.principalPassword ?? randomBytes(16).toString('hex');
      principalActivationRequired = !data.principalPassword;

      const principalHash = await bcrypt.hash(principalPassword, 10);
      principal = await this.userRepo.save({
        name: data.principalName!,
        email: data.principalEmail,
        password_hash: principalHash,
        role: UserRole.ADMIN,
        phone: data.principalPhone,
        institute,
        status: principalActivationRequired ? 'pending_activation' : 'active',
      });
    }

    await this.dashboardService.seedAfterRegistration(
      institute,
      academic,
      subscription,
    );

    const auth = await this.authService.login({
      email: data.ownerEmail,
      password: data.password,
    });

    return {
      message: data.isMinimalSignup
        ? 'Institute registered successfully'
        : 'Full institute setup complete',
      ...auth,
      institute: this.toPublicInstitute(institute),
      academic: {
        grades_offered: academic.grades,
        student_range: academic.students_range,
        teacher_range: academic.teachers_count,
      },
      subscription: {
        plan_name: subscription.plan,
        plan_price: subscription.plan_price,
        trial_days: subscription.trial_days,
        trial_ends_at: subscription.trial_ends_at,
        billing_name: subscription.billing_name,
        billing_address: subscription.billing_address,
        payment_last4: subscription.payment_last4,
        has_payment_method: Boolean(subscription.payment_method_token),
      },
      principal: principal
        ? {
            user: this.usersService.toPublicUser(principal),
            activation_required: principalActivationRequired,
          }
        : null,
    };
  }

  private toRegistrationDetail(
    institute: Institute,
    academic: AcademicConfig | null,
    subscription: Subscription | null,
  ) {
    const principal = institute.users?.find((u) => u.role === UserRole.ADMIN);

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
      users: institute.users?.map((u) => this.usersService.toPublicUser(u)),
      principal: principal
        ? {
            user: this.usersService.toPublicUser(principal),
            activation_required: principal.status === 'pending_activation',
          }
        : null,
    };
  }

  private assertActorCanAccessInstitute(
    institute: Institute,
    actor: { sub: number; email: string; role: UserRole },
  ) {
    if (!this.actorCanAccessInstitute(institute, actor)) {
      throw new ForbiddenException(
        'You do not have permission to view this institute registration',
      );
    }
  }

  private assertActorCanDeleteInstitute(
    institute: Institute,
    actor: { sub: number; email: string; role: UserRole },
  ) {
    if (
      actor.role === UserRole.SUPERADMIN ||
      actor.role === UserRole.ADMIN
    ) {
      return;
    }

    if (
      actor.role === UserRole.OWNER &&
      institute.owner_email.toLowerCase() === actor.email.toLowerCase()
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to delete this institute registration',
    );
  }

  private actorCanAccessInstitute(
    institute: Institute,
    actor: { sub: number; email: string; role: UserRole },
  ): boolean {
    if (
      actor.role === UserRole.SUPERADMIN ||
      actor.role === UserRole.ADMIN
    ) {
      return true;
    }

    if (
      actor.role === UserRole.OWNER &&
      institute.owner_email.toLowerCase() === actor.email.toLowerCase()
    ) {
      return true;
    }

    const linked = institute.users?.some((u) => u.user_id === actor.sub);
    return Boolean(linked);
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

  private async assertEmailsAvailable(
    data: NormalizedInstituteRegistration,
  ) {
    const emails = [data.ownerEmail];
    if (data.createPrincipal && data.principalEmail) {
      emails.push(data.principalEmail);
    }

    for (const email of emails) {
      const existingInstitute = await this.instituteRepo.findOne({
        where: { owner_email: email },
      });
      if (existingInstitute) {
        throw new ConflictException(
          `An institute is already registered with email ${email}`,
        );
      }

      const existingUser = await this.userRepo.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException(`A user already exists with email ${email}`);
      }
    }

    if (
      data.createPrincipal &&
      data.principalEmail === data.ownerEmail
    ) {
      throw new BadRequestException(
        'principal_email must be different from owner_email',
      );
    }
  }
}
