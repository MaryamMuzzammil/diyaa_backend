import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassSection } from '../institute/entities/class-section.entity';
import { StudentActivityLog } from '../student/entities/student-activity-log.entity';
import { StudentBadge } from '../student/entities/student-badge.entity';
import { StudentDashboardSummary } from '../student/entities/student-dashboard-summary.entity';
import { StudentReward } from '../student/entities/student-reward.entity';
import { StudentSubjectProgress } from '../student/entities/student-subject-progress.entity';
import { Student } from '../student/student.entity';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { ClassStudentEnrollment } from './entities/class-student-enrollment.entity';
import { TeacherAssignment } from './entities/teacher-assignment.entity';
import { TeacherClassAssignment } from './entities/teacher-class-assignment.entity';
import { TeacherGroupMember } from './entities/teacher-group-member.entity';
import { TeacherNotification } from './entities/teacher-notification.entity';
import { TeacherStudentGroup } from './entities/teacher-student-group.entity';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { TeacherController } from './teacher.controller';
import { TeacherDashboardService } from './teacher-dashboard.service';
import { TeacherGroupsService } from './teacher-groups.service';
import { TeacherRewardsService } from './teacher-rewards.service';
import { TeacherScopeService } from './teacher-scope.service';
import { Teacher } from './teacher.entity';
import { TeacherService } from './teacher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Teacher,
      ClassSection,
      Student,
      TeacherClassAssignment,
      ClassStudentEnrollment,
      TeacherAssignment,
      AssignmentSubmission,
      TeacherStudentGroup,
      TeacherGroupMember,
      TeacherNotification,
      StudentDashboardSummary,
      StudentSubjectProgress,
      StudentBadge,
      StudentActivityLog,
      StudentReward,
    ]),
  ],
  controllers: [TeacherController],
  providers: [
    TeacherService,
    TeacherScopeService,
    TeacherDashboardService,
    TeacherAssignmentsService,
    TeacherGroupsService,
    TeacherRewardsService,
  ],
  exports: [TeacherService, TypeOrmModule],
})
export class TeacherModule {}
