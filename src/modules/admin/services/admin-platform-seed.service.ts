import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { SystemAlert } from '../entities/system-alert.entity';

@Injectable()
export class AdminPlatformSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(PlatformSetting)
    private settingsRepo: Repository<PlatformSetting>,
    @InjectRepository(SubscriptionPlan)
    private plansRepo: Repository<SubscriptionPlan>,
    @InjectRepository(PlatformGame)
    private gamesRepo: Repository<PlatformGame>,
    @InjectRepository(CurriculumVersion)
    private curriculumRepo: Repository<CurriculumVersion>,
    @InjectRepository(PlatformContent)
    private contentRepo: Repository<PlatformContent>,
    @InjectRepository(ModerationItem)
    private moderationRepo: Repository<ModerationItem>,
    @InjectRepository(CommunityPost)
    private communityRepo: Repository<CommunityPost>,
    @InjectRepository(SecurityAlert)
    private securityRepo: Repository<SecurityAlert>,
    @InjectRepository(LoginAnomaly)
    private anomalyRepo: Repository<LoginAnomaly>,
    @InjectRepository(SystemAlert)
    private systemAlertRepo: Repository<SystemAlert>,
    @InjectRepository(PlatformNotification)
    private notificationRepo: Repository<PlatformNotification>,
  ) {}

  async onModuleInit() {
    await this.seedSettings();
    await this.seedPlans();
    await this.seedGames();
    await this.seedCurriculum();
    await this.seedDemoContent();
    await this.seedModeration();
    await this.seedCommunity();
    await this.seedSecurity();
    await this.seedNotifications();
  }

  private async seedSettings() {
    const defaults: Array<Omit<PlatformSetting, 'updated_at'>> = [
      {
        key: 'dino_ai_assistant',
        label: 'Dino AI Assistant',
        category: 'Feature Toggles',
        description:
          'Enable AI-labeled tutoring experiences across schools',
        enabled: true,
        value: null,
        updated_by: null,
      },
      {
        key: 'daily_rewards',
        label: 'Daily Rewards',
        category: 'Feature Toggles',
        description: 'Enable daily reward streaks for students',
        enabled: true,
        value: null,
        updated_by: null,
      },
      {
        key: 'community_posts',
        label: 'Community Posts',
        category: 'Feature Toggles',
        description: 'Allow teachers and parents to publish community posts',
        enabled: true,
        value: null,
        updated_by: null,
      },
      {
        key: 'default_session_length',
        label: 'Default Session Length',
        category: 'Default Configurations',
        description: 'Default learning session length in minutes',
        enabled: true,
        value: '20',
        updated_by: null,
      },
      {
        key: 'parent_notifications',
        label: 'Parent Notifications',
        category: 'Default Configurations',
        description: 'Send parent progress notifications by default',
        enabled: true,
        value: 'enabled',
        updated_by: null,
      },
      {
        key: 'require_content_review',
        label: 'Require Content Review',
        category: 'Global Content Rules',
        description: 'Teacher content must be approved before publishing',
        enabled: true,
        value: null,
        updated_by: null,
      },
      {
        key: 'lock_core_curriculum',
        label: 'Lock Core Curriculum',
        category: 'Global Content Rules',
        description: 'Prevent schools from editing core curriculum nodes',
        enabled: false,
        value: null,
        updated_by: null,
      },
      {
        key: 'student_data_access',
        label: 'Student Data Access',
        category: 'Security & Permissions',
        description: 'Allow institute admins to access student records',
        enabled: true,
        value: null,
        updated_by: null,
      },
      {
        key: 'content_creation',
        label: 'Content Creation',
        category: 'Security & Permissions',
        description: 'Allow teachers to create and submit content',
        enabled: true,
        value: null,
        updated_by: null,
      },
      {
        key: 'parent_dashboard_access',
        label: 'Parent Dashboard Access',
        category: 'Security & Permissions',
        description: 'Enable parent dashboard across institutes',
        enabled: true,
        value: null,
        updated_by: null,
      },
      {
        key: 'admin_privileges',
        label: 'Admin Privileges',
        category: 'Security & Permissions',
        description: 'Allow institute sub-admins elevated permissions',
        enabled: true,
        value: null,
        updated_by: null,
      },
    ];

    for (const row of defaults) {
      const exists = await this.settingsRepo.findOne({ where: { key: row.key } });
      if (!exists) await this.settingsRepo.save(this.settingsRepo.create(row));
    }
  }

  private async seedPlans() {
    if ((await this.plansRepo.count()) > 0) return;
    await this.plansRepo.save([
      this.plansRepo.create({
        name: 'Starter School',
        price: 15000,
        currency: 'PKR',
        duration: 'Monthly',
        features: 'Up to 300 students, basic analytics',
        status: 'active',
      }),
      this.plansRepo.create({
        name: 'Premium School',
        price: 45000,
        currency: 'PKR',
        duration: 'Monthly',
        features:
          'Up to 2,000 students, games, parent portal, school analytics',
        status: 'active',
      }),
    ]);
  }

  private async seedGames() {
    if ((await this.gamesRepo.count()) > 0) return;
    await this.gamesRepo.save([
      this.gamesRepo.create({
        name: 'Math Adventure',
        subject: 'Math',
        grade: 'Grade 2',
        status: 'active',
        plays: 1234,
        average_score: 82,
        completion_rate: 76,
      }),
      this.gamesRepo.create({
        name: 'English Word Quest',
        subject: 'English',
        grade: 'Grade 3',
        status: 'active',
        plays: 980,
        average_score: 79,
        completion_rate: 71,
      }),
    ]);
  }

  private async seedCurriculum() {
    if ((await this.curriculumRepo.count()) > 0) return;
    await this.curriculumRepo.save([
      this.curriculumRepo.create({
        version: 'v3.2.1',
        release_date: new Date().toISOString().slice(0, 10),
        status: 'Current',
        changes: 'Added adaptive learning paths',
        created_by: null,
      }),
      this.curriculumRepo.create({
        version: 'v3.1.0',
        release_date: '2026-04-01',
        status: 'Previous',
        changes: 'Urdu level map updates',
        created_by: null,
      }),
    ]);
  }

  private async seedDemoContent() {
    if ((await this.contentRepo.count()) > 0) return;
    await this.contentRepo.save([
      this.contentRepo.create({
        title: 'Grade 2 Math - Fractions',
        type: 'Lesson',
        status: 'Pending',
        submitted_by_name: 'Sarah J.',
        submitted_by_role: 'Teacher',
      }),
      this.contentRepo.create({
        title: 'Reading Comprehension Quiz',
        type: 'Assessment',
        status: 'Approved',
        submitted_by_name: 'Ali R.',
        submitted_by_role: 'Teacher',
        reviewed_at: new Date(),
      }),
    ]);
  }

  private async seedModeration() {
    if ((await this.moderationRepo.count()) > 0) return;
    await this.moderationRepo.save([
      this.moderationRepo.create({
        content: 'Student submission: Drawing',
        type: 'Image',
        risk_level: 'Low',
        flagged_by: 'AI',
        status: 'pending',
        reason: 'Routine image scan',
      }),
      this.moderationRepo.create({
        content: 'Chat message flagged',
        type: 'Text',
        risk_level: 'High',
        flagged_by: 'User Report',
        status: 'pending',
        reason: 'Possible unsafe language',
      }),
    ]);
  }

  private async seedCommunity() {
    if ((await this.communityRepo.count()) > 0) return;
    await this.communityRepo.save([
      this.communityRepo.create({
        author_id: 1,
        author_name: 'Sarah Johnson',
        author_role: 'Teacher',
        content: 'Has anyone tried the new interactive math games?',
        status: 'pending',
      }),
    ]);
  }

  private async seedSecurity() {
    if ((await this.securityRepo.count()) > 0) return;
    await this.securityRepo.save([
      this.securityRepo.create({
        type: 'warning',
        title: 'Multiple failed login attempts',
        description: 'User: sarah.j@diyaa.edu',
      }),
    ]);
    if ((await this.anomalyRepo.count()) > 0) return;
    await this.anomalyRepo.save([
      this.anomalyRepo.create({
        user_email: 'sarah.j@diyaa.edu',
        anomaly_type: 'Unusual Location',
        location: 'Singapore',
        ip_address: '1.2.3.4',
        status: 'open',
      }),
    ]);
    if ((await this.systemAlertRepo.count()) > 0) return;
    await this.systemAlertRepo.save([
      this.systemAlertRepo.create({
        type: 'success',
        title: 'System backup completed',
      }),
    ]);
  }

  private async seedNotifications() {
    if ((await this.notificationRepo.count()) > 0) return;
    await this.notificationRepo.save([
      this.notificationRepo.create({
        type: 'info',
        title: '4 new schools registered this week',
        body: 'Review institute onboarding queue',
        link: '/dashboard/institutes',
      }),
    ]);
  }
}
