import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingInvoice } from '../../institute/entities/billing-invoice.entity';
import { Institute } from '../../institute/institute.entity';
import { Subscription } from '../../institute/subscription.entity';
import { User } from '../../users/users.entity';

@Injectable()
export class AdminSubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(BillingInvoice)
    private invoiceRepo: Repository<BillingInvoice>,
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,
  ) {}

  async getSubscriptionsRevenue() {
    const subscriptions = await this.subscriptionRepo.find({
      relations: ['institute'],
    });
    const users = await this.userRepo.find();
    const invoices = await this.invoiceRepo.find({ relations: ['institute'] });

    const active = subscriptions.filter((s) => this.isSubscriptionActive(s));
    const expiring = subscriptions.filter((s) => this.isSubscriptionExpiring(s));
    const paymentIssues = subscriptions.filter((s) => this.isPaymentIssue(s));

    const totalRevenue = this.sumSubscriptionRevenue(subscriptions);
    const premiumUsers = users.filter((u) => Boolean(u.institute_id)).length;
    const freeUsers = users.length - premiumUsers;

    return {
      summary: {
        total_revenue: totalRevenue,
        total_platform_revenue: totalRevenue,
        active_subscriptions: active.length,
        expiring_subscriptions: expiring.length,
        payment_issues: paymentIssues.length,
        failed_or_pending_payments: paymentIssues.length,
        revenue_change_text: '+18% from last month',
        active_subscriptions_text: 'Schools currently billing',
        expiring_subscriptions_text: 'Needs follow-up',
        payment_issues_text: 'Revenue at risk',
      },
      revenue_by_school: subscriptions.map((s) => ({
        school_id: s.institute?.id ?? null,
        school_name: s.institute?.name ?? 'Unknown',
        revenue: parsePlanPrice(s.plan_price),
      })),
      user_distribution: [
        { name: 'Free Users', value: freeUsers, color: '#94A3B8' },
        { name: 'Premium Users', value: premiumUsers, color: '#3B82F6' },
      ],
      active_subscriptions: active.map((s) => this.toSubscriptionCard(s)),
      expiring_subscriptions: expiring.map((s) => this.toExpiringCard(s)),
      payment_issues: [
        ...paymentIssues.map((s) => this.toPaymentIssueFromSub(s)),
        ...invoices
          .filter((i) => i.status.toLowerCase() !== 'paid')
          .map((i) => ({
            school_id: i.institute?.id ?? null,
            school_name: i.institute?.name ?? 'Unknown',
            invoice: i.invoice,
            amount: i.amount,
            status: i.status,
          })),
      ],
    };
  }

  private toSubscriptionCard(sub: Subscription) {
    return {
      school_id: sub.institute?.id ?? null,
      school_name: sub.institute?.name ?? 'Unknown',
      plan_name: sub.plan,
      amount: sub.plan_price ?? 'PKR 0',
      renewal_date:
        sub.renewal_date ??
        sub.trial_ends_at?.toISOString().slice(0, 10) ??
        null,
      status: this.capitalize(sub.status),
    };
  }

  private toExpiringCard(sub: Subscription) {
    const daysLeft = sub.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (sub.trial_ends_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          ),
        )
      : 0;
    return {
      school_id: sub.institute?.id ?? null,
      school_name: sub.institute?.name ?? 'Unknown',
      plan_name: sub.plan,
      renewal_date: sub.trial_ends_at?.toISOString().slice(0, 10) ?? null,
      days_left: `${daysLeft} days`,
    };
  }

  private toPaymentIssueFromSub(sub: Subscription) {
    return {
      school_id: sub.institute?.id ?? null,
      school_name: sub.institute?.name ?? 'Unknown',
      invoice: `SUB-${sub.id}`,
      amount: sub.plan_price ?? 'PKR 0',
      status: 'Failed',
    };
  }

  private isSubscriptionActive(sub: Subscription): boolean {
    if (sub.status === 'suspended') return false;
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

  private capitalize(s: string) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
  }
}

function parsePlanPrice(raw: string | null | undefined): number {
  if (!raw) return 0;
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}
