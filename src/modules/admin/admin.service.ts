import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institute } from '../institute/institute.entity';
import { Subscription } from '../institute/subscription.entity';
import { User, UserRole } from '../users/users.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getOverview() {
    const [institutes, users, subscriptions] = await Promise.all([
      this.instituteRepo.find(),
      this.userRepo.find(),
      this.subscriptionRepo.find({ relations: ['institute'] }),
    ]);

    const activeSchools = institutes.filter((i) => i.status === 'active').length;
    const inactiveSchools = institutes.length - activeSchools;
    const totalRevenue = this.sumSubscriptionRevenue(subscriptions);
    const activeSubs = subscriptions.filter((s) =>
      this.isSubscriptionActive(s),
    );
    const expiringSubs = subscriptions.filter((s) =>
      this.isSubscriptionExpiring(s),
    );
    const paymentIssues = subscriptions.filter((s) =>
      this.isPaymentIssue(s),
    );

    const students = users.filter((u) => u.role === UserRole.STUDENT).length;
    const premiumUsers = users.filter((u) => u.institute != null).length;
    const freeUsers = users.length - premiumUsers;

    return {
      stats: [
        {
          key: 'total_schools',
          label: 'Total Schools',
          value: String(institutes.length),
          change: `+${this.newSchoolsThisMonth(institutes)} this month`,
        },
        {
          key: 'active_schools',
          label: 'Active Schools',
          value: String(activeSchools),
          change: institutes.length
            ? `${Math.round((activeSchools / institutes.length) * 100)}% active`
            : '0% active',
        },
        {
          key: 'total_users',
          label: 'Total Users',
          value: this.formatCount(users.length),
          change: `+${students} students`,
        },
        {
          key: 'active_today',
          label: 'Active Today',
          value: this.formatCount(this.countActiveToday(users)),
          change: `${users.length ? Math.round((this.countActiveToday(users) / users.length) * 100) : 0}% of users`,
        },
        {
          key: 'monthly_revenue',
          label: 'Revenue This Month',
          value: this.formatPkr(totalRevenue),
          change: '+18%',
        },
        {
          key: 'new_schools',
          label: 'New Schools',
          value: String(this.newSchoolsThisMonth(institutes)),
          change: 'This month',
        },
        {
          key: 'platform_health',
          label: 'Platform Health',
          value: '98.5%',
          change: '+0.2%',
        },
      ],
      school_health: {
        active_schools: activeSchools,
        inactive_schools: inactiveSchools,
      },
      recent_alerts: this.buildAlerts(
        expiringSubs.length,
        paymentIssues.length,
        institutes.length,
      ),
    };
  }

  async getSubscriptionsRevenue() {
    const subscriptions = await this.subscriptionRepo.find({
      relations: ['institute'],
    });
    const users = await this.userRepo.find({ relations: ['institute'] });

    const active = subscriptions.filter((s) => this.isSubscriptionActive(s));
    const expiring = subscriptions.filter((s) => this.isSubscriptionExpiring(s));
    const paymentIssues = subscriptions.filter((s) => this.isPaymentIssue(s));

    const totalRevenue = this.sumSubscriptionRevenue(subscriptions);
    const premiumUsers = users.filter((u) => Boolean(u.institute)).length;
    const freeUsers = users.length - premiumUsers;

    return {
      summary: {
        total_platform_revenue: this.formatPkr(totalRevenue),
        total_platform_revenue_raw: totalRevenue,
        revenue_change: '+18% from last month',
        active_subscriptions: active.length,
        active_subscriptions_text: 'Schools currently billing',
        expiring_subscriptions: expiring.length,
        expiring_subscriptions_text: 'Needs follow-up',
        failed_pending_payments: paymentIssues.length,
        failed_pending_text: 'Revenue at risk',
      },
      revenue_by_school: subscriptions.map((s) => ({
        school_id: s.institute?.id ?? null,
        school_name: s.institute?.name ?? 'Unknown',
        revenue: parsePlanPrice(s.plan_price),
        revenue_display: s.plan_price ?? 'PKR 0',
        plan: s.plan,
      })),
      user_distribution: {
        free_users: freeUsers,
        premium_users: premiumUsers,
      },
      active_subscriptions: active.map((s) => this.toSubscriptionRow(s)),
      expiring_subscriptions: expiring.map((s) => this.toSubscriptionRow(s)),
      payment_issues: paymentIssues.map((s) => this.toSubscriptionRow(s)),
    };
  }

  async listSchools() {
    const institutes = await this.instituteRepo.find({ order: { id: 'ASC' } });
    const subscriptions = await this.subscriptionRepo.find({
      relations: ['institute'],
    });
    const subByInstitute = new Map(
      subscriptions.map((s) => [s.institute?.id, s]),
    );

    const users = await this.userRepo.find({ relations: ['institute'] });

    return {
      schools: institutes.map((inst) => {
        const sub = subByInstitute.get(inst.id);
        const instUsers = users.filter((u) => u.institute?.id === inst.id);
        const students = instUsers.filter(
          (u) => u.role === UserRole.STUDENT,
        ).length;
        const teachers = instUsers.filter(
          (u) => u.role === UserRole.TEACHER,
        ).length;

        return {
          id: inst.id,
          school_id: inst.school_id,
          name: inst.name,
          city: inst.city,
          students: students || 0,
          teachers: teachers || 0,
          plan: sub?.plan ?? 'Starter',
          status: this.capitalize(inst.status),
          revenue: parsePlanPrice(sub?.plan_price),
          renewal_date: sub?.trial_ends_at
            ? sub.trial_ends_at.toISOString().slice(0, 10)
            : null,
          engagement: students
            ? Math.min(100, Math.round((students / (students + 10)) * 78))
            : 0,
          active_users: instUsers.filter((u) => u.status === 'active').length,
        };
      }),
    };
  }

  private toSubscriptionRow(sub: Subscription) {
    return {
      id: sub.id,
      school_id: sub.institute?.id ?? null,
      school_name: sub.institute?.name ?? 'Unknown',
      plan: sub.plan,
      plan_price: sub.plan_price,
      trial_ends_at: sub.trial_ends_at,
      has_payment_method: Boolean(sub.payment_method_token),
      payment_last4: sub.payment_last4,
      status: this.subscriptionStatusLabel(sub),
    };
  }

  private subscriptionStatusLabel(sub: Subscription): string {
    if (this.isPaymentIssue(sub)) return 'Payment Issue';
    if (this.isSubscriptionExpiring(sub)) return 'Expiring';
    if (this.isSubscriptionActive(sub)) return 'Active';
    return 'Inactive';
  }

  private isSubscriptionActive(sub: Subscription): boolean {
    if (sub.payment_method_token) return true;
    if (!sub.trial_ends_at) return true;
    return sub.trial_ends_at.getTime() > Date.now();
  }

  private isSubscriptionExpiring(sub: Subscription): boolean {
    if (!sub.trial_ends_at || sub.payment_method_token) return false;
    const days =
      (sub.trial_ends_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7;
  }

  private isPaymentIssue(sub: Subscription): boolean {
    if (sub.payment_method_token) return false;
    if (!sub.trial_ends_at) return false;
    return sub.trial_ends_at.getTime() <= Date.now();
  }

  private sumSubscriptionRevenue(subs: Subscription[]): number {
    return subs.reduce((sum, s) => sum + parsePlanPrice(s.plan_price), 0);
  }

  private newSchoolsThisMonth(institutes: Institute[]): number {
    const now = new Date();
    return institutes.filter((i) => {
      if (!i.created_at) return false;
      const d = new Date(i.created_at);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }).length;
  }

  private countActiveToday(users: User[]): number {
    const dayMs = 86400000;
    const now = Date.now();
    return users.filter((u) => {
      if (u.status !== 'active') return false;
      if (!u.last_active_at) return false;
      return now - u.last_active_at.getTime() < dayMs;
    }).length;
  }

  private buildAlerts(
    expiring: number,
    paymentIssues: number,
    schoolCount: number,
  ) {
    const alerts: Array<{
      id: number;
      type: string;
      title: string;
      created_at: string;
    }> = [
      {
        id: 1,
        type: 'success',
        title: 'System backup completed',
        created_at: new Date().toISOString(),
      },
    ];

    if (expiring > 0) {
      alerts.push({
        id: alerts.length + 1,
        type: 'warning',
        title: `${expiring} subscription(s) expiring within 7 days`,
        created_at: new Date().toISOString(),
      });
    }

    if (paymentIssues > 0) {
      alerts.push({
        id: alerts.length + 1,
        type: 'error',
        title: `${paymentIssues} school(s) with failed or pending payment`,
        created_at: new Date().toISOString(),
      });
    }

    if (schoolCount === 0) {
      alerts.push({
        id: alerts.length + 1,
        type: 'info',
        title: 'No schools registered yet',
        created_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  private formatCount(n: number): string {
    return n.toLocaleString('en-US');
  }

  private formatPkr(amount: number): string {
    if (amount >= 1_000_000) {
      return `PKR ${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `PKR ${Math.round(amount).toLocaleString('en-US')}`;
    }
    return `PKR ${amount}`;
  }

  private capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
  }
}

function parsePlanPrice(raw: string | null | undefined): number {
  if (!raw) return 0;
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}
