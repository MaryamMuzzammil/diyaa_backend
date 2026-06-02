import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentActivityLog } from '../student/entities/student-activity-log.entity';
import { StudentBadge } from '../student/entities/student-badge.entity';
import { StudentDashboardSummary } from '../student/entities/student-dashboard-summary.entity';
import { StudentReward } from '../student/entities/student-reward.entity';
import { StudentSubjectProgress } from '../student/entities/student-subject-progress.entity';
import { Student } from '../student/student.entity';
import { ParentSafetyControl } from './entities/parent-safety-control.entity';
import { ParentSetting } from './entities/parent-setting.entity';
import { ParentStudentLink } from './entities/parent-student-link.entity';
import { ParentController } from './parent.controller';
import { ParentDashboardService } from './parent-dashboard.service';
import { Parent } from './parent.entity';
import { ParentService } from './parent.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Parent,
      ParentStudentLink,
      ParentSafetyControl,
      ParentSetting,
      Student,
      StudentDashboardSummary,
      StudentSubjectProgress,
      StudentActivityLog,
      StudentBadge,
      StudentReward,
    ]),
  ],
  controllers: [ParentController],
  providers: [ParentService, ParentDashboardService],
  exports: [ParentService, TypeOrmModule],
})
export class ParentModule {}
