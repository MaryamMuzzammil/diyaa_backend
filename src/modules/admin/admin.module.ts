import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingInvoice } from '../institute/entities/billing-invoice.entity';
import { AcademicConfig } from '../institute/academic.entity';
import { InstituteModule } from '../institute/institute.module';
import { Institute } from '../institute/institute.entity';
import { Subscription } from '../institute/subscription.entity';
import { StudentActivityLog } from '../student/entities/student-activity-log.entity';
import { StudentGame } from '../student/entities/student-game.entity';
import { StudentModule } from '../student/student.module';
import { User } from '../users/users.entity';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AuditLog } from './entities/audit-log.entity';
import { CommunityPost } from './entities/community-post.entity';
import { CurriculumVersion } from './entities/curriculum-version.entity';
import { LoginAnomaly } from './entities/login-anomaly.entity';
import { ModerationItem } from './entities/moderation-item.entity';
import { PlatformContent } from './entities/platform-content.entity';
import { PlatformGame } from './entities/platform-game.entity';
import { PlatformNotification } from './entities/platform-notification.entity';
import { PlatformSetting } from './entities/platform-setting.entity';
import { SecurityAlert } from './entities/security-alert.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SystemAlert } from './entities/system-alert.entity';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminInstitutesService } from './services/admin-institutes.service';
import { AdminOverviewService } from './services/admin-overview.service';
import { AdminPlatformSeedService } from './services/admin-platform-seed.service';
import { AdminPlatformService } from './services/admin-platform.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { AdminUsersService } from './services/admin-users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Institute,
      AcademicConfig,
      Subscription,
      User,
      BillingInvoice,
      StudentActivityLog,
      StudentGame,
      AuditLog,
      PlatformSetting,
      PlatformContent,
      CurriculumVersion,
      ModerationItem,
      CommunityPost,
      SubscriptionPlan,
      PlatformNotification,
      SecurityAlert,
      LoginAnomaly,
      SystemAlert,
      PlatformGame,
    ]),
    InstituteModule,
    UsersModule,
    StudentModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminOverviewService,
    AdminInstitutesService,
    AdminUsersService,
    AdminPlatformService,
    AdminSubscriptionsService,
    AdminAuditService,
    AdminPlatformSeedService,
  ],
})
export class AdminModule {}
