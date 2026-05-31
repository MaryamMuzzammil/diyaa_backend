import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  gameKey,
  getSubjectConfig,
  normalizeSubject,
  resolveLevelStatus,
  resolveSkillStatus,
  SUBJECT_CURRICULUM,
  type CurriculumSubjectConfig,
  type LevelStatus,
} from './constants/student-curriculum.constants';
import { CompleteGameDto } from './dto/complete-game.dto';
import { StudentActivityLog } from './entities/student-activity-log.entity';
import { GameSkillType, StudentGame } from './entities/student-game.entity';
import { StudentBadge } from './entities/student-badge.entity';
import { StudentDashboardSummary } from './entities/student-dashboard-summary.entity';
import { StudentLevelProgress } from './entities/student-level-progress.entity';
import { StudentReward } from './entities/student-reward.entity';
import { StudentSkillProgress } from './entities/student-skill-progress.entity';
import { StudentSubjectProgress } from './entities/student-subject-progress.entity';
import { Student } from './student.entity';
import { StudentStatsService } from './student-stats.service';

export type DashboardLevelView = {
  subject: string;
  skill: string;
  level_number: number;
  status: LevelStatus;
  total_score: number;
  games_completed: number;
  games_total: number;
  games_won: number;
  best_score: number;
  completed_at: Date | null;
  /** Same skill row — kept for frontend compatibility. */
  skills: {
    skill: string;
    status: LevelStatus;
    games_completed: number;
    games_total: number;
    games_won: number;
    total_score: number;
    best_score: number;
  }[];
};

@Injectable()
export class StudentProgressService {
  constructor(
    @InjectRepository(Student)
    private studentRepo: Repository<Student>,
    @InjectRepository(StudentDashboardSummary)
    private summaryRepo: Repository<StudentDashboardSummary>,
    @InjectRepository(StudentSubjectProgress)
    private subjectRepo: Repository<StudentSubjectProgress>,
    @InjectRepository(StudentLevelProgress)
    private levelRepo: Repository<StudentLevelProgress>,
    @InjectRepository(StudentSkillProgress)
    private skillRepo: Repository<StudentSkillProgress>,
    @InjectRepository(StudentBadge)
    private badgeRepo: Repository<StudentBadge>,
    @InjectRepository(StudentReward)
    private rewardRepo: Repository<StudentReward>,
    @InjectRepository(StudentActivityLog)
    private activityRepo: Repository<StudentActivityLog>,
    @InjectRepository(StudentGame)
    private gameRepo: Repository<StudentGame>,
    private statsService: StudentStatsService,
  ) {}

  async ensureCurriculumInitialized(student: Student) {
    await this.syncCurriculum(student);
    await this.statsService.getOrCreateSummary(student);
  }

  /** Add missing subjects/levels/skills for existing students. */
  async syncCurriculum(student: Student) {
    for (const config of SUBJECT_CURRICULUM) {
      const subjectRow = await this.subjectRepo.findOne({
        where: { student: { id: student.id }, subject: config.subject },
      });

      if (!subjectRow) {
        await this.initSubject(student, config);
        continue;
      }

      if (subjectRow.levels_total !== config.level_count) {
        subjectRow.levels_total = config.level_count;
        await this.subjectRepo.save(subjectRow);
      }

      for (let level = 1; level <= config.level_count; level++) {
        await this.ensureLevel(student, config, level);
      }
    }
  }

  async completeGame(student: Student, dto: CompleteGameDto) {
    await this.ensureCurriculumInitialized(student);

    const subject = normalizeSubject(dto.subject);
    const skill = dto.skill.trim().toLowerCase();
    const config = this.getSubjectConfig(subject);

    if (dto.level_number > config.level_count) {
      throw new BadRequestException(
        `Level ${dto.level_number} does not exist for ${subject}`,
      );
    }
    if (!config.skills.some((s) => s === skill)) {
      throw new BadRequestException(
        `Skill "${skill}" is not part of ${subject}. Use: ${config.skills.join(', ')}`,
      );
    }
    if (dto.game_index > config.games_per_skill) {
      throw new BadRequestException('game_index out of range');
    }

    await this.assertSkillLevelPlayable(
      student.id,
      subject,
      skill,
      dto.level_number,
    );

    const skillRow = await this.skillRepo.findOne({
      where: {
        student: { id: student.id },
        subject,
        level_number: dto.level_number,
        skill,
      },
    });
    if (!skillRow) {
      throw new BadRequestException('Skill progress not found');
    }

    const gKey = gameKey(subject, dto.level_number, skill, dto.game_index);

    const alreadyWon = await this.activityRepo.findOne({
      where: {
        student: { id: student.id },
        game_key: gKey,
        won: true,
      },
    });

    if (dto.won) {
      await this.activityRepo.save(
        this.activityRepo.create({
          student,
          activity_type: 'game',
          subject,
          level_number: dto.level_number,
          skill,
          game_key: gKey,
          score: dto.score,
          won: true,
          duration_minutes: dto.duration_minutes ?? 0,
        }),
      );

      await this.gameRepo.save(
        this.gameRepo.create({
          student,
          subject,
          level_number: dto.level_number,
          score: dto.score,
          type: skill as GameSkillType,
        }),
      );

      await this.statsService.applyGameToSummary(student, {
        score: dto.score,
        won: true,
        duration_minutes: dto.duration_minutes,
      });

      if (!alreadyWon) {
        skillRow.games_completed = Math.min(
          skillRow.games_total,
          skillRow.games_completed + 1,
        );
        skillRow.games_won += 1;
        skillRow.total_score += dto.score;
        skillRow.best_score = Math.max(skillRow.best_score, dto.score);
        await this.skillRepo.save(skillRow);

        await this.rollupLevel(student.id, subject, dto.level_number);
        await this.rollupSubject(student.id, subject);
        await this.syncLessonsCompleted(student.id);
        await this.maybeAward(student, { ...dto, subject, skill });
      }
    }

    const summary = await this.statsService.getOrCreateSummary(student);
    const stat_cards = await this.statsService.buildStatCards(
      student.id,
      summary,
    );

    const subjectLevels = await this.buildLevelsView(student.id, subject);

    return {
      progress: subjectLevels.find(
        (l) =>
          l.subject === subject &&
          l.level_number === dto.level_number &&
          l.skill === skill,
      ),
      levels: subjectLevels,
      stat_cards,
      stars_earned: this.statsService.starsFromScore(dto.score, dto.won),
    };
  }

  async buildLevelsView(
    studentId: number,
    subjectFilter?: string,
  ): Promise<DashboardLevelView[]> {
    const skillWhere = subjectFilter
      ? { student: { id: studentId }, subject: subjectFilter }
      : { student: { id: studentId } };

    const skills = await this.skillRepo.find({
      where: skillWhere,
      order: { subject: 'ASC', skill: 'ASC', level_number: 'ASC' },
    });

    return skills.map((s) => {
      const prev = skills.find(
        (p) =>
          p.subject === s.subject &&
          p.skill === s.skill &&
          p.level_number === s.level_number - 1,
      );
      const status = resolveSkillStatus(s, prev ?? null, s.level_number);
      const skillView = {
        skill: s.skill,
        status,
        games_completed: s.games_completed,
        games_total: s.games_total,
        games_won: s.games_won,
        total_score: s.total_score,
        best_score: s.best_score,
      };

      return {
        subject: s.subject,
        skill: s.skill,
        level_number: s.level_number,
        status,
        total_score: s.total_score,
        games_completed: s.games_completed,
        games_total: s.games_total,
        games_won: s.games_won,
        best_score: s.best_score,
        completed_at: status === 'completed' ? s.updated_at : null,
        skills: [skillView],
      };
    });
  }

  private async assertSkillLevelPlayable(
    studentId: number,
    subject: string,
    skill: string,
    levelNumber: number,
  ) {
    const skillRow = await this.skillRepo.findOne({
      where: {
        student: { id: studentId },
        subject,
        level_number: levelNumber,
        skill,
      },
    });
    if (!skillRow) {
      throw new BadRequestException('Skill progress not found');
    }

    const prevSkill =
      levelNumber > 1
        ? await this.skillRepo.findOne({
            where: {
              student: { id: studentId },
              subject,
              level_number: levelNumber - 1,
              skill,
            },
          })
        : null;

    const status = resolveSkillStatus(
      skillRow,
      prevSkill,
      levelNumber,
    );

    if (status === 'locked') {
      throw new BadRequestException('This level is locked');
    }
  }

  private async initSubject(student: Student, config: CurriculumSubjectConfig) {
    for (let level = 1; level <= config.level_count; level++) {
      await this.ensureLevel(student, config, level);
    }

    await this.subjectRepo.save(
      this.subjectRepo.create({
        student,
        subject: config.subject,
        levels_total: config.level_count,
      }),
    );
  }

  private async ensureLevel(
    student: Student,
    config: CurriculumSubjectConfig,
    level: number,
  ) {
    const levelGames = config.skills.length * config.games_per_skill;
    let levelRow = await this.levelRepo.findOne({
      where: {
        student: { id: student.id },
        subject: config.subject,
        level_number: level,
      },
    });

    if (!levelRow) {
      levelRow = await this.levelRepo.save(
        this.levelRepo.create({
          student,
          subject: config.subject,
          level_number: level,
          status: level === 1 ? 'unlocked' : 'locked',
          games_total: levelGames,
        }),
      );
    } else if (levelRow.games_total !== levelGames) {
      levelRow.games_total = levelGames;
      await this.levelRepo.save(levelRow);
    }

    for (const skill of config.skills) {
      const existingSkill = await this.skillRepo.findOne({
        where: {
          student: { id: student.id },
          subject: config.subject,
          level_number: level,
          skill,
        },
      });
      if (existingSkill) continue;

      await this.skillRepo.save(
        this.skillRepo.create({
          student,
          subject: config.subject,
          level_number: level,
          skill,
          games_total: config.games_per_skill,
        }),
      );
    }
  }

  private async rollupLevel(
    studentId: number,
    subject: string,
    levelNumber: number,
  ) {
    const skills = await this.skillRepo.find({
      where: {
        student: { id: studentId },
        subject,
        level_number: levelNumber,
      },
    });

    const gamesCompleted = skills.reduce((s, r) => s + r.games_completed, 0);
    const gamesTotal = skills.reduce((s, r) => s + r.games_total, 0);
    const totalScore = skills.reduce((s, r) => s + r.total_score, 0);

    const level = await this.levelRepo.findOne({
      where: { student: { id: studentId }, subject, level_number: levelNumber },
    });
    if (!level) return;

    level.games_completed = gamesCompleted;
    level.games_total = gamesTotal;
    level.total_score = totalScore;

    const allSkills = await this.skillRepo.find({
      where: { student: { id: studentId }, subject },
    });

    level.status = resolveLevelStatus(
      skills.map((s) => {
        const prev = allSkills.find(
          (p) =>
            p.subject === s.subject &&
            p.skill === s.skill &&
            p.level_number === s.level_number - 1,
        );
        return resolveSkillStatus(s, prev ?? null, s.level_number);
      }),
    );
    if (level.status === 'completed') {
      level.completed_at = level.completed_at ?? new Date();
    }

    await this.levelRepo.save(level);
  }

  private async rollupSubject(studentId: number, subject: string) {
    const [skills, row] = await Promise.all([
      this.skillRepo.find({ where: { student: { id: studentId }, subject } }),
      this.subjectRepo.findOne({
        where: { student: { id: studentId }, subject },
      }),
    ]);
    if (!row) return;

    const completedSkillLevels = skills.filter(
      (s) => s.games_total > 0 && s.games_completed >= s.games_total,
    ).length;

    row.levels_completed = completedSkillLevels;
    row.total_score = skills.reduce((sum, s) => sum + s.total_score, 0);
    row.progress_percent =
      skills.length > 0
        ? Math.round((completedSkillLevels / skills.length) * 100)
        : 0;
    await this.subjectRepo.save(row);
  }

  private async syncLessonsCompleted(studentId: number) {
    const skills = await this.skillRepo.find({
      where: { student: { id: studentId } },
    });
    const count = skills.filter(
      (s) => s.games_total > 0 && s.games_completed >= s.games_total,
    ).length;
    const summary = await this.summaryRepo.findOne({
      where: { student: { id: studentId } },
    });
    if (summary) {
      summary.lessons_completed = count;
      await this.summaryRepo.save(summary);
    }
  }

  private async maybeAward(student: Student, dto: CompleteGameDto) {
    if (dto.score >= 80) {
      const key = `high_score_${normalizeSubject(dto.subject).toLowerCase()}_l${dto.level_number}`;
      const exists = await this.badgeRepo.findOne({
        where: { student: { id: student.id }, badge_key: key },
      });
      if (!exists) {
        await this.badgeRepo.save(
          this.badgeRepo.create({
            student,
            badge_key: key,
            title: `${normalizeSubject(dto.subject)} Level ${dto.level_number} Star`,
            description: `Scored ${dto.score} on a game`,
          }),
        );
      }
    }

    const summary = await this.summaryRepo.findOne({
      where: { student: { id: student.id } },
    });
    if (summary && summary.games_won >= 5) {
      const key = 'five_wins';
      const exists = await this.rewardRepo.findOne({
        where: { student: { id: student.id }, reward_key: key },
      });
      if (!exists) {
        await this.rewardRepo.save(
          this.rewardRepo.create({
            student,
            reward_key: key,
            title: '5 Games Won',
            points: 50,
          }),
        );
      }
    }
  }

  private getSubjectConfig(subject: string): CurriculumSubjectConfig {
    try {
      return getSubjectConfig(subject);
    } catch {
      throw new BadRequestException(`Unknown subject: ${subject}`);
    }
  }
}
