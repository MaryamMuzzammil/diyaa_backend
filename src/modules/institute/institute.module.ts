import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { InstituteAdminModule } from '../institute-admin/institute-admin.module';
import { ParentModule } from '../parent/parent.module';
import { RbacModule } from '../rbac/rbac.module';
import { StudentModule } from '../student/student.module';
import { Student } from '../student/student.entity';
import { ClassStudentEnrollment } from '../teacher/entities/class-student-enrollment.entity';
import { TeacherClassAssignment } from '../teacher/entities/teacher-class-assignment.entity';
import { Teacher } from '../teacher/teacher.entity';
import { TeacherModule } from '../teacher/teacher.module';
import { User } from '../users/users.entity';
import { UsersModule } from '../users/users.module';
import { AcademicConfig } from './academic.entity';
import { BillingInvoice } from './entities/billing-invoice.entity';
import { ClassSection } from './entities/class-section.entity';
import { DailyActivity } from './entities/daily-activity.entity';
import { EngagementInsight } from './entities/engagement-insight.entity';
import { InstituteContent } from './entities/institute-content.entity';
import { SubjectMetric } from './entities/subject-metric.entity';
import { InstituteAccessService } from './institute-access.service';
import { InstituteDashboardService } from './institute-dashboard.service';
import { InstituteMembersService } from './institute-members.service';
import { Institute } from './institute.entity';
import { InstituteController } from './institute.controller';
import { InstituteService } from './institute.service';
import { Subscription } from './subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Institute,
      User,
      AcademicConfig,
      Subscription,
      ClassSection,
      Student,
      Teacher,
      TeacherClassAssignment,
      ClassStudentEnrollment,
      InstituteContent,
      BillingInvoice,
      DailyActivity,
      SubjectMetric,
      EngagementInsight,
    ]),
    UsersModule,
    AuthModule,
    RbacModule,
    StudentModule,
    TeacherModule,
    ParentModule,
    InstituteAdminModule,
  ],
  providers: [
    InstituteDashboardService,
    InstituteAccessService,
    InstituteService,
    InstituteMembersService,
  ],
  exports: [InstituteService, InstituteMembersService],
  controllers: [InstituteController],
})
export class InstituteModule {}
