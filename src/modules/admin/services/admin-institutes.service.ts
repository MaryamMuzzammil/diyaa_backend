import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicConfig } from '../../institute/academic.entity';
import { Institute } from '../../institute/institute.entity';
import { Subscription } from '../../institute/subscription.entity';
import { User, UserRole } from '../../users/users.entity';
import { paginate } from '../dto/pagination-query.dto';
import { AdminAuditService } from './admin-audit.service';

type Actor = { sub: number; email: string; role: UserRole };

@Injectable()
export class AdminInstitutesService {
  constructor(
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,
    @InjectRepository(AcademicConfig)
    private academicRepo: Repository<AcademicConfig>,
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private audit: AdminAuditService,
  ) {}

  async list(
    search?: string,
    status?: string,
    page = 1,
    limit = 20,
    sort = 'id',
    order: 'asc' | 'desc' = 'asc',
  ) {
    let institutes = await this.instituteRepo.find({
      relations: ['users'],
      order: { [sort === 'name' ? 'name' : 'id']: order.toUpperCase() as 'ASC' | 'DESC' },
    });

    if (status) {
      institutes = institutes.filter(
        (i) => i.status.toLowerCase() === status.toLowerCase(),
      );
    }
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      institutes = institutes.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.city.toLowerCase().includes(q) ||
          i.owner_email.toLowerCase().includes(q),
      );
    }

    const [academics, subscriptions] = await Promise.all([
      this.academicRepo.find({ relations: ['institute'] }),
      this.subscriptionRepo.find({ relations: ['institute'] }),
    ]);

    const mapped = institutes.map((institute) => {
      const academic = academics.find((a) => a.institute?.id === institute.id);
      const subscription = subscriptions.find(
        (s) => s.institute?.id === institute.id,
      );
      const users = institute.users ?? [];
      return {
        institute: {
          id: institute.id,
          name: institute.name,
          type: institute.type,
          registration_number: institute.registration_number,
          city: institute.city,
          country: institute.country,
          address: institute.address,
          owner_name: institute.owner_name,
          owner_email: institute.owner_email,
          owner_phone: institute.owner_phone,
          status: institute.status,
          created_at: institute.created_at,
        },
        academic: {
          grades_offered: academic?.grades ?? [],
          student_range: academic?.students_range ?? null,
          teacher_range: academic?.teachers_count ?? null,
          actual_student_count: users.filter((u) => u.role === UserRole.STUDENT)
            .length,
          actual_teacher_count: users.filter((u) => u.role === UserRole.TEACHER)
            .length,
        },
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
              status: subscription.status,
              renewal_date: subscription.renewal_date,
            }
          : null,
        analytics: {
          engagement: users.length
            ? Math.min(100, 50 + (users.length % 30))
            : 0,
          active_users: users.filter((u) => u.status === 'active').length,
        },
      };
    });

    const paged = paginate(mapped, page, limit);
    return { institutes: paged.items, pagination: paged.pagination };
  }

  async updateStatus(
    id: number,
    status: 'active' | 'suspended',
    reason: string | undefined,
    actor: Actor,
  ) {
    const institute = await this.instituteRepo.findOne({ where: { id } });
    if (!institute) throw new NotFoundException('Institute not found');
    if (!['active', 'suspended'].includes(status)) {
      throw new BadRequestException('status must be active or suspended');
    }

    institute.status = status;
    institute.suspension_reason = status === 'suspended' ? reason ?? null : null;
    await this.instituteRepo.save(institute);

    if (status === 'suspended') {
      await this.userRepo.update(
        { institute_id: id, role: UserRole.OWNER },
        { status: 'active' },
      );
      await this.userRepo
        .createQueryBuilder()
        .update(User)
        .set({ status: 'suspended' })
        .where('institute_id = :id', { id })
        .andWhere('role NOT IN (:...roles)', {
          roles: [UserRole.SUPERADMIN],
        })
        .execute();
    } else {
      await this.userRepo.update({ institute_id: id }, { status: 'active' });
    }

    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: status === 'suspended' ? 'suspend_institute' : 'activate_institute',
      resourceType: 'institute',
      resourceId: id,
      metadata: { reason: reason ?? null },
    });

    return { institute: { id, status: institute.status, suspension_reason: institute.suspension_reason } };
  }
}
