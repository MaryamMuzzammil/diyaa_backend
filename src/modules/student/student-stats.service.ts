import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentBadge } from './entities/student-badge.entity';
import { StudentDashboardSummary } from './entities/student-dashboard-summary.entity';
import { StudentReward } from './entities/student-reward.entity';
import { Student } from './student.entity';

@Injectable()
export class StudentStatsService {
  constructor(
    @InjectRepository(StudentDashboardSummary)
    private summaryRepo: Repository<StudentDashboardSummary>,
    @InjectRepository(StudentBadge)
    private badgeRepo: Repository<StudentBadge>,
    @InjectRepository(StudentReward)
    private rewardRepo: Repository<StudentReward>,
  ) {}

  async getOrCreateSummary(student: Student) {
    let summary = await this.summaryRepo.findOne({
      where: { student: { id: student.id } },
    });
    if (!summary) {
      summary = await this.summaryRepo.save(
        this.summaryRepo.create({ student }),
      );
    }
    return summary;
  }

  /** First activity of a new calendar day — updates day streak. */
  async recordActivityDay(summary: StudentDashboardSummary) {
    const today = this.todayKey();
    const previous = summary.last_activity_date;

    if (previous === today) {
      return summary;
    }

    if (!previous) {
      summary.current_streak = 1;
    } else {
      const yesterday = this.addDays(today, -1);
      summary.current_streak =
        previous === yesterday ? summary.current_streak + 1 : 1;
    }

    summary.last_activity_date = today;
    if (summary.current_streak > summary.longest_streak) {
      summary.longest_streak = summary.current_streak;
    }

    return this.summaryRepo.save(summary);
  }

  starsFromScore(score: number, won: boolean): number {
    if (!won) return 0;
    return Math.max(1, Math.round(score / 10));
  }

  async applyGameToSummary(
    student: Student,
    opts: { score: number; won: boolean; duration_minutes?: number },
  ) {
    let summary = await this.getOrCreateSummary(student);
    summary.games_played += 1;

    if (opts.won) {
      summary.games_won += 1;
      summary.total_xp += opts.score;
      summary.stars += this.starsFromScore(opts.score, true);
    }

    summary.today_minutes += opts.duration_minutes ?? 0;
    summary = await this.recordActivityDay(summary);
    return this.summaryRepo.save(summary);
  }

  async buildStatCards(studentId: number, summary: StudentDashboardSummary) {
    const [badgesCount, rewardsCount] = await Promise.all([
      this.badgeRepo.count({ where: { student: { id: studentId } } }),
      this.rewardRepo.count({ where: { student: { id: studentId } } }),
    ]);

    return [
      {
        key: 'day_streak',
        label: 'Day Streak',
        value: summary.current_streak,
        icon: 'flame',
      },
      {
        key: 'stars',
        label: 'Stars',
        value: summary.stars,
        icon: 'star',
      },
      {
        key: 'badges',
        label: 'Badges',
        value: badgesCount,
        icon: 'badge',
      },
      {
        key: 'rewards',
        label: 'Rewards',
        value: rewardsCount,
        icon: 'gift',
      },
    ];
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private addDays(isoDate: string, days: number): string {
    const d = new Date(isoDate + 'T12:00:00.000Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
}
