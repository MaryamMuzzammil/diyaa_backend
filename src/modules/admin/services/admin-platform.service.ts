import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingInvoice } from '../../institute/entities/billing-invoice.entity';
import { Institute } from '../../institute/institute.entity';
import { Subscription } from '../../institute/subscription.entity';
import { User, UserRole } from '../../users/users.entity';
import { paginate } from '../dto/pagination-query.dto';
import { CommunityPost } from '../entities/community-post.entity';
import { CurriculumVersion } from '../entities/curriculum-version.entity';
import { LoginAnomaly } from '../entities/login-anomaly.entity';
import { ModerationItem } from '../entities/moderation-item.entity';
import { PlatformContent } from '../entities/platform-content.entity';
import { PlatformGame } from '../entities/platform-game.entity';
import { PlatformNotification } from '../entities/platform-notification.entity';
import { PlatformSetting } from '../entities/platform-setting.entity';
import { SecurityAlert } from '../entities/security-alert.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { AdminAuditService } from './admin-audit.service';

type Actor = { sub: number; email: string; role: UserRole };

@Injectable()
export class AdminPlatformService {
  constructor(
    @InjectRepository(PlatformContent)
    private contentRepo: Repository<PlatformContent>,
    @InjectRepository(PlatformGame)
    private gameRepo: Repository<PlatformGame>,
    @InjectRepository(CurriculumVersion)
    private curriculumRepo: Repository<CurriculumVersion>,
    @InjectRepository(ModerationItem)
    private moderationRepo: Repository<ModerationItem>,
    @InjectRepository(CommunityPost)
    private communityRepo: Repository<CommunityPost>,
    @InjectRepository(PlatformSetting)
    private settingsRepo: Repository<PlatformSetting>,
    @InjectRepository(SecurityAlert)
    private securityAlertRepo: Repository<SecurityAlert>,
    @InjectRepository(LoginAnomaly)
    private anomalyRepo: Repository<LoginAnomaly>,
    @InjectRepository(SubscriptionPlan)
    private planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(PlatformNotification)
    private notificationRepo: Repository<PlatformNotification>,
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(BillingInvoice)
    private invoiceRepo: Repository<BillingInvoice>,
    private audit: AdminAuditService,
  ) {}

  // --- Content ---
  async listContent(status?: string, type?: string, page = 1, limit = 20) {
    let rows = await this.contentRepo.find({ order: { submitted_at: 'DESC' } });
    if (status) {
      rows = rows.filter(
        (r) => r.status.toLowerCase() === status.toLowerCase(),
      );
    }
    if (type) {
      rows = rows.filter((r) => r.type.toLowerCase() === type.toLowerCase());
    }
    const mapped = rows.map((r) => this.toContent(r));
    const paged = paginate(mapped, page, limit);
    return { content: paged.items, pagination: paged.pagination };
  }

  async getContent(id: number) {
    const row = await this.contentRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Content not found');
    return { content: this.toContent(row) };
  }

  async createContent(body: Partial<PlatformContent>, actor: Actor) {
    const row = await this.contentRepo.save(
      this.contentRepo.create({
        title: body.title ?? 'Untitled',
        type: body.type ?? 'Lesson',
        status: 'Pending',
        body: body.body ?? null,
        submitted_by_id: actor.sub,
        submitted_by_name: actor.email,
        submitted_by_role: 'Product Owner',
      }),
    );
    return { content: this.toContent(row) };
  }

  async updateContent(id: number, body: Partial<PlatformContent>, actor: Actor) {
    const row = await this.getContentRow(id);
    Object.assign(row, body);
    await this.contentRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'update_content',
      resourceType: 'content',
      resourceId: id,
    });
    return { content: this.toContent(row) };
  }

  async approveContent(id: number, actor: Actor) {
    const row = await this.getContentRow(id);
    row.status = 'Approved';
    row.reviewed_by_id = actor.sub;
    row.reviewed_at = new Date();
    row.rejection_reason = null;
    await this.contentRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'approve_content',
      resourceType: 'content',
      resourceId: id,
    });
    return { content: this.toContent(row) };
  }

  async rejectContent(id: number, reason: string, actor: Actor) {
    const row = await this.getContentRow(id);
    row.status = 'Rejected';
    row.reviewed_by_id = actor.sub;
    row.reviewed_at = new Date();
    row.rejection_reason = reason;
    await this.contentRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'reject_content',
      resourceType: 'content',
      resourceId: id,
      metadata: { reason },
    });
    return { content: this.toContent(row) };
  }

  // --- Games ---
  async listGames() {
    const games = await this.gameRepo.find({ order: { id: 'ASC' } });
    return {
      games: games.map((g) => ({
        id: `game_${g.id}`,
        name: g.name,
        subject: g.subject,
        grade: g.grade,
        status: g.status,
        plays: g.plays,
        average_score: g.average_score,
        completion_rate: g.completion_rate,
        created_at: g.created_at,
      })),
    };
  }

  async getGame(id: number) {
    const g = await this.gameRepo.findOne({ where: { id } });
    if (!g) throw new NotFoundException('Game not found');
    return {
      game: {
        id: `game_${g.id}`,
        name: g.name,
        subject: g.subject,
        grade: g.grade,
        status: g.status,
        plays: g.plays,
        average_score: g.average_score,
        completion_rate: g.completion_rate,
        created_at: g.created_at,
      },
    };
  }

  async updateGameStatus(id: number, status: string, actor: Actor) {
    const g = await this.gameRepo.findOne({ where: { id } });
    if (!g) throw new NotFoundException('Game not found');
    g.status = status;
    await this.gameRepo.save(g);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'update_game_status',
      resourceType: 'game',
      resourceId: id,
      metadata: { status },
    });
    return { game: { id: `game_${g.id}`, status: g.status } };
  }

  async gamesAnalytics() {
    const games = await this.gameRepo.find();
    const totalPlays = games.reduce((s, g) => s + g.plays, 0);
    return {
      total_games: games.length,
      total_plays: totalPlays,
      average_completion:
        games.length > 0
          ? Math.round(
              games.reduce((s, g) => s + g.completion_rate, 0) / games.length,
            )
          : 0,
      top_games: [...games]
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5)
        .map((g) => ({
          id: `game_${g.id}`,
          name: g.name,
          plays: g.plays,
        })),
    };
  }

  // --- Curriculum ---
  async listCurriculumVersions() {
    const versions = await this.curriculumRepo.find({
      order: { created_at: 'DESC' },
    });
    return { versions };
  }

  async createCurriculumVersion(
    body: { version: string; changes: string; release_date?: string },
    actor: Actor,
  ) {
    const row = await this.curriculumRepo.save(
      this.curriculumRepo.create({
        version: body.version,
        changes: body.changes,
        release_date: body.release_date ?? new Date().toISOString().slice(0, 10),
        status: 'Draft',
        created_by: actor.sub,
      }),
    );
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'create_curriculum_version',
      resourceType: 'curriculum_version',
      resourceId: row.id,
    });
    return { version: row };
  }

  async getCurriculumVersion(id: number) {
    const row = await this.curriculumRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Version not found');
    return { version: row };
  }

  async publishCurriculumVersion(id: number, actor: Actor) {
    const row = await this.curriculumRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Version not found');
    await this.curriculumRepo.update({ status: 'Current' }, { status: 'Previous' });
    row.status = 'Current';
    await this.curriculumRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'publish_curriculum_version',
      resourceType: 'curriculum_version',
      resourceId: id,
    });
    return { version: row };
  }

  async rollbackCurriculumVersion(id: number, actor: Actor) {
    const row = await this.curriculumRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Version not found');
    if (row.status === 'Current') {
      throw new BadRequestException('Version is already current');
    }
    return this.publishCurriculumVersion(id, actor);
  }

  // --- Moderation ---
  async moderationSummary() {
    const items = await this.moderationRepo.find();
    return {
      safe_content: items.filter((i) => i.status === 'approved').length,
      needs_review: items.filter((i) => i.status === 'pending').length,
      flagged_blocked: items.filter((i) => i.status === 'blocked').length,
    };
  }

  async moderationQueue(risk?: string, type?: string, page = 1, limit = 20) {
    let items = await this.moderationRepo.find({ order: { created_at: 'DESC' } });
    if (risk) items = items.filter((i) => i.risk_level.toLowerCase() === risk.toLowerCase());
    if (type) items = items.filter((i) => i.type.toLowerCase() === type.toLowerCase());
    const mapped = items.map((i) => ({
      id: i.id,
      content: i.content,
      type: i.type,
      risk_level: i.risk_level,
      flagged_by: i.flagged_by,
      timestamp: formatRelative(i.created_at),
      raw_content_url: i.raw_content_url,
      reason: i.reason,
      status: i.status,
    }));
    const paged = paginate(mapped, page, limit);
    return { queue: paged.items, pagination: paged.pagination };
  }

  async approveModeration(id: number, actor: Actor) {
    const row = await this.getModerationRow(id);
    row.status = 'approved';
    row.moderator_id = actor.sub;
    row.moderated_at = new Date();
    await this.moderationRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'approve_moderation',
      resourceType: 'moderation',
      resourceId: id,
    });
    return { item: row };
  }

  async blockModeration(id: number, actor: Actor) {
    const row = await this.getModerationRow(id);
    row.status = 'blocked';
    row.moderator_id = actor.sub;
    row.moderated_at = new Date();
    await this.moderationRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'block_moderation',
      resourceType: 'moderation',
      resourceId: id,
    });
    return { item: row };
  }

  // --- Security ---
  async listSecurityPermissions() {
    const rows = await this.settingsRepo.find({
      where: { category: 'Security & Permissions' },
    });
    const map: Record<string, boolean> = {};
    for (const r of rows) map[r.key] = r.enabled;
    return map;
  }

  async patchSecurityPermission(key: string, enabled: boolean, actor: Actor) {
    const row = await this.settingsRepo.findOne({ where: { key } });
    if (!row) throw new NotFoundException('Permission setting not found');
    row.enabled = enabled;
    row.updated_by = actor.sub;
    await this.settingsRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'change_security_permission',
      resourceType: 'permission',
      resourceId: key,
      metadata: { enabled },
    });
    return { key, enabled };
  }

  async listSecurityAlerts() {
    const alerts = await this.securityAlertRepo.find({
      order: { created_at: 'DESC' },
    });
    return {
      alerts: alerts.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        created_at: a.created_at,
      })),
    };
  }

  async listLoginAnomalies() {
    const rows = await this.anomalyRepo.find({ order: { created_at: 'DESC' } });
    return {
      anomalies: rows.map((a) => ({
        id: a.id,
        user_email: a.user_email,
        anomaly_type: a.anomaly_type,
        location: a.location,
        ip_address: a.ip_address,
        time: formatRelative(a.created_at),
        status: a.status,
      })),
    };
  }

  async investigateAnomaly(id: number, actor: Actor) {
    const row = await this.anomalyRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Anomaly not found');
    row.status = 'investigating';
    await this.anomalyRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'investigate_login_anomaly',
      resourceType: 'login_anomaly',
      resourceId: id,
    });
    return { anomaly: row };
  }

  async blockAnomalyIp(id: number, actor: Actor) {
    const row = await this.anomalyRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Anomaly not found');
    row.status = 'blocked';
    await this.anomalyRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'block_ip_login_anomaly',
      resourceType: 'login_anomaly',
      resourceId: id,
      metadata: { ip: row.ip_address },
    });
    return { anomaly: row };
  }

  // --- Community ---
  async communitySummary() {
    const posts = await this.communityRepo.find();
    return {
      total_posts: posts.length,
      pending_approval: posts.filter((p) => p.status === 'pending').length,
      reported_posts: posts.filter((p) => p.status === 'reported').length,
    };
  }

  async listCommunityPosts(status?: string, page = 1, limit = 20) {
    let posts = await this.communityRepo.find({ order: { created_at: 'DESC' } });
    if (status) {
      posts = posts.filter((p) => p.status === status);
    }
    const mapped = posts.map((p) => ({
      id: p.id,
      author: { id: p.author_id, name: p.author_name, role: p.author_role },
      content: p.content,
      status: p.status,
      created_at: p.created_at,
      report_count: p.report_count,
    }));
    const paged = paginate(mapped, page, limit);
    return { posts: paged.items, pagination: paged.pagination };
  }

  async approveCommunityPost(id: number, actor: Actor) {
    const row = await this.getCommunityRow(id);
    row.status = 'approved';
    await this.communityRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'approve_community_post',
      resourceType: 'community_post',
      resourceId: id,
    });
    return { post: row };
  }

  async rejectCommunityPost(id: number, reason: string, actor: Actor) {
    const row = await this.getCommunityRow(id);
    row.status = 'rejected';
    row.rejection_reason = reason;
    await this.communityRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'reject_community_post',
      resourceType: 'community_post',
      resourceId: id,
      metadata: { reason },
    });
    return { post: row };
  }

  async patchCommunityPost(id: number, body: { content?: string; status?: string }) {
    const row = await this.getCommunityRow(id);
    if (body.content) row.content = body.content;
    if (body.status) row.status = body.status;
    await this.communityRepo.save(row);
    return { post: row };
  }

  // --- Platform settings ---
  async getPlatformSettings() {
    const rows = await this.settingsRepo.find({ order: { category: 'ASC' } });
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      if (row.category === 'Security & Permissions') continue;
      const bucket = groups.get(row.category) ?? [];
      bucket.push(row);
      groups.set(row.category, bucket);
    }
    return {
      groups: [...groups.entries()].map(([category, items]) => ({
        category,
        items: items.map((i) => ({
          key: i.key,
          label: i.label,
          description: i.description,
          enabled: i.enabled,
          value: i.value,
        })),
      })),
    };
  }

  async patchPlatformSetting(
    key: string,
    body: { enabled?: boolean; value?: string },
    actor: Actor,
  ) {
    const row = await this.settingsRepo.findOne({ where: { key } });
    if (!row) throw new NotFoundException('Setting not found');
    if (body.enabled !== undefined) row.enabled = body.enabled;
    if (body.value !== undefined) row.value = body.value;
    row.updated_by = actor.sub;
    await this.settingsRepo.save(row);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'update_platform_setting',
      resourceType: 'platform_setting',
      resourceId: key,
      metadata: body,
    });
    return { setting: row };
  }

  // --- Search & notifications ---
  async search(q: string) {
    const query = q.trim().toLowerCase();
    if (!query) {
      return { institutes: [], users: [], content: [], invoices: [], community_posts: [] };
    }

    const [institutes, users, content, invoices, posts] = await Promise.all([
      this.instituteRepo.find(),
      this.userRepo.find(),
      this.contentRepo.find(),
      this.invoiceRepo.find({ relations: ['institute'] }),
      this.communityRepo.find(),
    ]);

    return {
      institutes: institutes
        .filter((i) => i.name.toLowerCase().includes(query))
        .slice(0, 5)
        .map((i) => ({ id: i.id, name: i.name, city: i.city })),
      users: users
        .filter(
          (u) =>
            u.name.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query),
        )
        .slice(0, 5)
        .map((u) => ({ id: u.user_id, name: u.name, email: u.email, role: u.role })),
      content: content
        .filter((c) => c.title.toLowerCase().includes(query))
        .slice(0, 5)
        .map((c) => ({ id: c.id, title: c.title, status: c.status })),
      invoices: invoices
        .filter((inv) => inv.invoice.toLowerCase().includes(query))
        .slice(0, 5)
        .map((inv) => ({
          id: inv.id,
          invoice: inv.invoice,
          school: inv.institute?.name,
          amount: inv.amount,
        })),
      community_posts: posts
        .filter((p) => p.content.toLowerCase().includes(query))
        .slice(0, 5)
        .map((p) => ({ id: p.id, content: p.content.slice(0, 80) })),
    };
  }

  async listNotifications() {
    const rows = await this.notificationRepo.find({
      order: { created_at: 'DESC' },
      take: 50,
    });
    return { notifications: rows };
  }

  async markNotificationRead(id: number) {
    await this.notificationRepo.update(id, { read: true });
    return { id, read: true };
  }

  // --- Subscription plans ---
  async listPlans() {
    const plans = await this.planRepo.find({ order: { id: 'ASC' } });
    const institutes = await this.instituteRepo.find();
    const subscriptions = await this.subscriptionRepo.find({
      relations: ['institute'],
    });
    return {
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency,
        duration: p.duration,
        assigned_schools: subscriptions.filter((s) => s.plan === p.name).length,
        features: p.features,
        status: p.status,
      })),
    };
  }

  async createPlan(body: Partial<SubscriptionPlan>, actor: Actor) {
    const plan = await this.planRepo.save(this.planRepo.create(body));
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'create_subscription_plan',
      resourceType: 'subscription_plan',
      resourceId: plan.id,
    });
    return { plan };
  }

  async updatePlan(id: number, body: Partial<SubscriptionPlan>, actor: Actor) {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    Object.assign(plan, body);
    await this.planRepo.save(plan);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'update_subscription_plan',
      resourceType: 'subscription_plan',
      resourceId: id,
    });
    return { plan };
  }

  async assignPlanToInstitute(instituteId: number, planId: number, actor: Actor) {
    const [institute, plan] = await Promise.all([
      this.instituteRepo.findOne({ where: { id: instituteId } }),
      this.planRepo.findOne({ where: { id: planId } }),
    ]);
    if (!institute) throw new NotFoundException('Institute not found');
    if (!plan) throw new NotFoundException('Plan not found');

    let sub = await this.subscriptionRepo.findOne({
      where: { institute: { id: instituteId } },
      relations: ['institute'],
    });
    if (!sub) {
      sub = this.subscriptionRepo.create({ institute });
    }
    sub.plan = plan.name;
    sub.plan_price = `${plan.currency} ${plan.price.toLocaleString('en-US')}`;
    sub.status = 'active';
    await this.subscriptionRepo.save(sub);

    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'assign_plan',
      resourceType: 'institute',
      resourceId: instituteId,
      metadata: { plan_id: planId, plan_name: plan.name },
    });

    return { subscription: sub };
  }

  async retryInvoice(id: number, actor: Actor) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: ['institute'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    invoice.status = 'Paid';
    await this.invoiceRepo.save(invoice);
    await this.audit.log({
      actorUserId: actor.sub,
      actorEmail: actor.email,
      action: 'retry_invoice',
      resourceType: 'invoice',
      resourceId: id,
    });
    return { invoice };
  }

  async resolvePaymentIssue(id: number, actor: Actor) {
    return this.retryInvoice(id, actor);
  }

  private async getContentRow(id: number) {
    const row = await this.contentRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Content not found');
    return row;
  }

  private async getModerationRow(id: number) {
    const row = await this.moderationRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Moderation item not found');
    return row;
  }

  private async getCommunityRow(id: number) {
    const row = await this.communityRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Post not found');
    return row;
  }

  private toContent(r: PlatformContent) {
    return {
      id: r.id,
      title: r.title,
      type: r.type,
      status: r.status,
      submitted_by: r.submitted_by_id
        ? {
            id: r.submitted_by_id,
            name: r.submitted_by_name,
            role: r.submitted_by_role,
          }
        : null,
      submitted_at: r.submitted_at,
      reviewed_by: r.reviewed_by_id,
      reviewed_at: r.reviewed_at,
      rejection_reason: r.rejection_reason,
      body: r.body,
    };
  }
}

function formatRelative(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 3600) return `${Math.floor(sec / 60)} mins ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  return `${Math.floor(sec / 86400)} days ago`;
}
