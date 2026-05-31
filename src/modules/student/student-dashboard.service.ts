import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/users.entity';
import { StudentActivityLog } from './entities/student-activity-log.entity';
import { StudentBadge } from './entities/student-badge.entity';
import { StudentDashboardSummary } from './entities/student-dashboard-summary.entity';
import { StudentReward } from './entities/student-reward.entity';
import { StudentSubjectProgress } from './entities/student-subject-progress.entity';
import { Student } from './student.entity';
import { StudentProgressService } from './student-progress.service';
import { StudentStatsService } from './student-stats.service';

type Actor = { sub: number; email: string; role: UserRole };

@Injectable()
export class StudentDashboardService {
  constructor(
    @InjectRepository(Student)
    private studentRepo: Repository<Student>,
    @InjectRepository(StudentDashboardSummary)
    private summaryRepo: Repository<StudentDashboardSummary>,
    @InjectRepository(StudentSubjectProgress)
    private subjectRepo: Repository<StudentSubjectProgress>,
    @InjectRepository(StudentBadge)
    private badgeRepo: Repository<StudentBadge>,
    @InjectRepository(StudentReward)
    private rewardRepo: Repository<StudentReward>,
    @InjectRepository(StudentActivityLog)
    private activityRepo: Repository<StudentActivityLog>,
    private progressService: StudentProgressService,
    private statsService: StudentStatsService,
  ) {}

  async getDashboard(actor: Actor) {
    const student = await this.getStudentForActor(actor);
    student.last_login_at = new Date();
    await this.studentRepo.save(student);

    await this.progressService.ensureCurriculumInitialized(student);

    let summary = await this.statsService.getOrCreateSummary(student);
    summary = await this.statsService.recordActivityDay(summary);

    const [
      summaryRow,
      subjects,
      levels,
      badges,
      rewards,
      recentActivity,
    ] = await Promise.all([
      Promise.resolve(summary),
      this.subjectRepo.find({ where: { student: { id: student.id } } }),
      this.progressService.buildLevelsView(student.id),
      this.badgeRepo.find({
        where: { student: { id: student.id } },
        order: { earned_at: 'DESC' },
      }),
      this.rewardRepo.find({
        where: { student: { id: student.id } },
        order: { earned_at: 'DESC' },
      }),
      this.activityRepo.find({
        where: { student: { id: student.id } },
        order: { created_at: 'DESC' },
        take: 30,
      }),
    ]);

    const stat_cards = await this.statsService.buildStatCards(
      student.id,
      summaryRow ?? summary,
    );

    return {
      student: this.toStudentProfile(student),
      stat_cards,
      stats: {
        total_xp: summaryRow?.total_xp ?? 0,
        stars: summaryRow?.stars ?? 0,
        current_streak: summaryRow?.current_streak ?? 0,
        longest_streak: summaryRow?.longest_streak ?? 0,
        lessons_completed: summaryRow?.lessons_completed ?? 0,
        games_won: summaryRow?.games_won ?? 0,
        games_played: summaryRow?.games_played ?? 0,
        today_minutes: summaryRow?.today_minutes ?? 0,
        daily_goal: student.daily_goal ?? '20m',
      },
      subjects: subjects.map((s) => ({
        subject: s.subject,
        levels_total: s.levels_total,
        levels_completed: s.levels_completed,
        total_score: s.total_score,
        progress_percent: s.progress_percent,
      })),
      sections: [
        {
          grade: student.grade,
          branch: student.branch,
        },
      ],
      levels,
      badges: badges.map((b) => ({
        badge_key: b.badge_key,
        title: b.title,
        description: b.description,
        earned_at: b.earned_at,
      })),
      rewards: rewards.map((r) => ({
        reward_key: r.reward_key,
        title: r.title,
        points: r.points,
        claimed: r.claimed,
        earned_at: r.earned_at,
      })),
      daily_activity: this.buildDailyActivity(recentActivity),
      calendar: this.buildCalendar(recentActivity),
    };
  }

  async getStudentForActor(actor: Actor): Promise<Student> {
    if (actor.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can access this dashboard');
    }
    const student = await this.studentRepo.findOne({
      where: { user_id: actor.sub },
      relations: ['user', 'institute'],
    });
    if (!student) {
      throw new NotFoundException(
        'Student profile not found. Ask your school to add you or complete signup.',
      );
    }
    return student;
  }

  toStudentProfile(student: Student) {
    return {
      id: student.id,
      user_id: student.user_id,
      institute_id: student.institute_id ?? student.institute?.id ?? null,
      name: student.name,
      email: student.email,
      role: 'Student',
      status: student.status,
      grade: student.grade,
      branch: student.branch,
      avatar_id: student.avatar_id,
      preferred_language: student.preferred_language,
      daily_goal: student.daily_goal,
      signup_method: student.signup_method,
      is_free_student: student.is_free_student,
      last_login_at: student.last_login_at,
      created_at: student.created_at,
    };
  }

  private buildDailyActivity(logs: StudentActivityLog[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter((l) => l.created_at >= today);
    return {
      games_played: todayLogs.filter((l) => l.activity_type === 'game').length,
      games_won: todayLogs.filter((l) => l.won).length,
      total_score: todayLogs.reduce((s, l) => s + l.score, 0),
      minutes: todayLogs.reduce((s, l) => s + l.duration_minutes, 0),
    };
  }

  private buildCalendar(logs: StudentActivityLog[]) {
    const byDay = new Map<string, { date: string; games: number; score: number }>();
    for (const log of logs) {
      const date = log.created_at.toISOString().slice(0, 10);
      const row = byDay.get(date) ?? { date, games: 0, score: 0 };
      row.games += 1;
      row.score += log.score;
      byDay.set(date, row);
    }
    return [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date));
  }
}
