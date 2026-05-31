import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentActivityLog } from './entities/student-activity-log.entity';
import { StudentGame } from './entities/student-game.entity';
import { StudentBadge } from './entities/student-badge.entity';
import { StudentDashboardSummary } from './entities/student-dashboard-summary.entity';
import { StudentLevelProgress } from './entities/student-level-progress.entity';
import { StudentReward } from './entities/student-reward.entity';
import { StudentSkillProgress } from './entities/student-skill-progress.entity';
import { StudentSubjectProgress } from './entities/student-subject-progress.entity';
import { StudentController } from './student.controller';
import { StudentDashboardService } from './student-dashboard.service';
import { StudentProgressService } from './student-progress.service';
import { StudentStatsService } from './student-stats.service';
import { Student } from './student.entity';
import { StudentService } from './student.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      StudentDashboardSummary,
      StudentSubjectProgress,
      StudentLevelProgress,
      StudentSkillProgress,
      StudentBadge,
      StudentReward,
      StudentActivityLog,
      StudentGame,
    ]),
  ],
  controllers: [StudentController],
  providers: [
    StudentService,
    StudentDashboardService,
    StudentProgressService,
    StudentStatsService,
  ],
  exports: [StudentService, TypeOrmModule],
})
export class StudentModule {}
