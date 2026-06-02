import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StudentActivityLog } from '../student/entities/student-activity-log.entity';
import { StudentBadge } from '../student/entities/student-badge.entity';
import { StudentDashboardSummary } from '../student/entities/student-dashboard-summary.entity';
import { StudentReward } from '../student/entities/student-reward.entity';
import { StudentSubjectProgress } from '../student/entities/student-subject-progress.entity';
import { Student } from '../student/student.entity';
import { UserRole } from '../users/users.entity';
import { ParentSafetyControl } from './entities/parent-safety-control.entity';
import { ParentSetting } from './entities/parent-setting.entity';
import { ParentStudentLink } from './entities/parent-student-link.entity';
import { Parent } from './parent.entity';

type Actor = { sub: number; email: string; role: UserRole };

const SUBJECT_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed'];
const SAFETY_DEFAULTS = [
  {
    key: 'learning_time_limit',
    title: 'Learning time limit',
    description: 'Keep daily app time balanced for your child.',
    enabled: true,
  },
  {
    key: 'ai_chat_safety',
    title: 'AI chat safety',
    description: 'Use child-friendly AI responses and stricter filtering.',
    enabled: true,
  },
  {
    key: 'progress_alerts',
    title: 'Progress alerts',
    description: 'Notify you when progress drops or streaks break.',
    enabled: true,
  },
];

@Injectable()
export class ParentDashboardService {
  constructor(
    @InjectRepository(Parent)
    private parentRepo: Repository<Parent>,
    @InjectRepository(ParentStudentLink)
    private linkRepo: Repository<ParentStudentLink>,
    @InjectRepository(ParentSafetyControl)
    private safetyRepo: Repository<ParentSafetyControl>,
    @InjectRepository(ParentSetting)
    private settingRepo: Repository<ParentSetting>,
    @InjectRepository(StudentDashboardSummary)
    private summaryRepo: Repository<StudentDashboardSummary>,
    @InjectRepository(StudentSubjectProgress)
    private subjectRepo: Repository<StudentSubjectProgress>,
    @InjectRepository(StudentActivityLog)
    private activityRepo: Repository<StudentActivityLog>,
    @InjectRepository(StudentBadge)
    private badgeRepo: Repository<StudentBadge>,
    @InjectRepository(StudentReward)
    private rewardRepo: Repository<StudentReward>,
  ) {}

  async getParentForActor(actor: Actor) {
    if (actor.role !== UserRole.PARENT) {
      throw new ForbiddenException('Only parents can access this resource');
    }

    const parent = await this.parentRepo.findOne({
      where: { user: { user_id: actor.sub } },
      relations: ['user', 'institute'],
    });
    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }
    return parent;
  }

  profile(parent: Parent) {
    return {
      id: `parent_${parent.id}`,
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
      avatar: parent.user?.avatar_id ?? null,
    };
  }

  async children(parent: Parent) {
    const students = await this.linkedStudents(parent);
    return {
      children: students.map((student) => this.toChildRow(student)),
    };
  }

  async overview(parent: Parent, childId: number) {
    const student = await this.assertLinkedChild(parent, childId);
    const [summary, subjects, activities, badges, rewards] = await Promise.all([
      this.summaryRepo.findOne({ where: { student: { id: student.id } } }),
      this.subjectRepo.find({ where: { student: { id: student.id } } }),
      this.activityRepo.find({
        where: { student: { id: student.id } },
        order: { created_at: 'DESC' },
        take: 20,
      }),
      this.badgeRepo.find({
        where: { student: { id: student.id } },
        order: { earned_at: 'DESC' },
        take: 5,
      }),
      this.rewardRepo.find({
        where: { student: { id: student.id } },
        order: { earned_at: 'DESC' },
        take: 5,
      }),
    ]);

    const foundationScore = this.foundationScore(subjects, summary);
    const lastActivity = activities[0]?.created_at ?? student.last_login_at;
    return {
      foundation_score: foundationScore,
      foundation_summary: this.foundationSummary(student.name, foundationScore),
      learning_streak_days: summary?.current_streak ?? 0,
      streak_summary:
        (summary?.current_streak ?? 0) > 0
          ? `${student.name} is building a steady learning habit.`
          : `${student.name} can start a new streak today.`,
      modules_completed: summary?.lessons_completed ?? 0,
      modules_summary: `${summary?.lessons_completed ?? 0} modules completed so far.`,
      last_active_label: lastActivity ? formatRelative(lastActivity) : 'No activity yet',
      last_active_time: lastActivity,
      ai_insights: this.aiInsights(subjects),
      celebrations: this.celebrations(badges, rewards),
    };
  }

  async progress(parent: Parent, childId: number) {
    const student = await this.assertLinkedChild(parent, childId);
    const [subjects, logs] = await Promise.all([
      this.subjectRepo.find({ where: { student: { id: student.id } } }),
      this.activityRepo.find({
        where: { student: { id: student.id } },
        order: { created_at: 'DESC' },
        take: 100,
      }),
    ]);

    return {
      subjects: subjects.map((row, index) => ({
        subject: row.subject,
        progress: row.progress_percent,
        improvement: row.progress_percent >= 70 ? '+8%' : '+3%',
        color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
      })),
      weekly_achievements: this.weeklyAchievements(logs),
    };
  }

  async behavior(parent: Parent, childId: number) {
    const student = await this.assertLinkedChild(parent, childId);
    const [summary, logs] = await Promise.all([
      this.summaryRepo.findOne({ where: { student: { id: student.id } } }),
      this.activityRepo.find({
        where: { student: { id: student.id } },
        order: { created_at: 'DESC' },
        take: 100,
      }),
    ]);

    const activeDays = this.activityDays(logs);
    return {
      cards: [
        {
          title: 'Focus time',
          value: `${summary?.today_minutes ?? 0} min`,
          subtitle: 'Spent learning today',
          status: (summary?.today_minutes ?? 0) >= 20 ? 'good' : 'needs_attention',
        },
        {
          title: 'Streak',
          value: `${summary?.current_streak ?? 0} days`,
          subtitle: 'Consecutive learning days',
          status: (summary?.current_streak ?? 0) >= 3 ? 'good' : 'steady',
        },
        {
          title: 'Game balance',
          value: `${summary?.games_won ?? 0}/${summary?.games_played ?? 0}`,
          subtitle: 'Games won out of played',
          status: (summary?.games_won ?? 0) > 0 ? 'good' : 'steady',
        },
      ],
      activity_days: activeDays,
    };
  }

  async certificates(parent: Parent, childId: number) {
    const student = await this.assertLinkedChild(parent, childId);
    const badges = await this.badgeRepo.find({
      where: { student: { id: student.id } },
      order: { earned_at: 'DESC' },
    });
    return badges.map((badge, index) => ({
      id: `cert_${badge.id}`,
      title: badge.title,
      date: badge.earned_at,
      icon: 'award',
      color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
      download_url: `/parent/children/stu_${student.id}/certificates/cert_${badge.id}/download`,
    }));
  }

  async safetyControls(parent: Parent, childId: number) {
    const student = await this.assertLinkedChild(parent, childId);
    await this.ensureSafetyDefaults(parent, student);
    const rows = await this.safetyRepo.find({
      where: { parent: { id: parent.id }, student: { id: student.id } },
      order: { id: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.key,
      key: row.key,
      title: row.title,
      description: row.description,
      value: row.value,
      enabled: row.enabled,
    }));
  }

  async patchSafetyControl(
    parent: Parent,
    childId: number,
    key: string,
    body: { enabled: boolean },
  ) {
    const student = await this.assertLinkedChild(parent, childId);
    await this.ensureSafetyDefaults(parent, student);
    const row = await this.safetyRepo.findOne({
      where: { parent: { id: parent.id }, student: { id: student.id }, key },
    });
    if (!row) throw new NotFoundException('Safety control not found');
    row.enabled = body.enabled;
    row.value = body.enabled ? 'enabled' : 'disabled';
    await this.safetyRepo.save(row);
    return {
      id: row.key,
      key: row.key,
      title: row.title,
      description: row.description,
      value: row.value,
      enabled: row.enabled,
    };
  }

  async notifications(parent: Parent, childId: number) {
    const student = await this.assertLinkedChild(parent, childId);
    const [logs, rewards] = await Promise.all([
      this.activityRepo.find({
        where: { student: { id: student.id } },
        order: { created_at: 'DESC' },
        take: 5,
      }),
      this.rewardRepo.find({
        where: { student: { id: student.id } },
        order: { earned_at: 'DESC' },
        take: 5,
      }),
    ]);
    return [
      ...rewards.map((reward) => ({
        id: `reward_${reward.id}`,
        title: 'New reward earned',
        message: `${student.name} earned ${reward.title}.`,
        time: formatRelative(reward.earned_at),
        color: '#16a34a',
        read: reward.claimed,
      })),
      ...logs.map((log) => ({
        id: `activity_${log.id}`,
        title: 'Learning activity',
        message: `${student.name} practiced ${log.subject ?? 'a learning activity'}.`,
        time: formatRelative(log.created_at),
        color: '#2563eb',
        read: false,
      })),
    ];
  }

  async engagementTips(parent: Parent, childId: number) {
    const student = await this.assertLinkedChild(parent, childId);
    const subjects = await this.subjectRepo.find({
      where: { student: { id: student.id } },
    });
    const weak = [...subjects].sort((a, b) => a.progress_percent - b.progress_percent)[0];
    return [
      {
        id: 'tip_read_together',
        title: 'Read together for a few minutes',
        description: `Ask ${student.name} to explain one thing learned today in their own words.`,
        duration: '10 min',
        icon: 'book-open',
        color: '#2563eb',
      },
      {
        id: 'tip_focus_subject',
        title: weak ? `Practice ${weak.subject}` : 'Pick one small practice goal',
        description: weak
          ? `${weak.subject} needs a little extra attention this week.`
          : 'A short daily practice session can build confidence.',
        duration: '15 min',
        icon: 'target',
        color: '#f59e0b',
      },
    ];
  }

  async settings(parent: Parent) {
    const row = await this.getOrCreateSettings(parent);
    return this.toSettings(row, parent);
  }

  async updateSettings(
    parent: Parent,
    body: Partial<ParentSetting> & {
      email?: string;
      language?: string;
      notification_preferences?: Partial<ParentSetting>;
    },
  ) {
    const row = await this.getOrCreateSettings(parent);
    const prefs = body.notification_preferences ?? body;
    for (const key of [
      'progress_notifications',
      'weekly_reports',
      'safety_alerts',
    ] as const) {
      if (typeof prefs[key] === 'boolean') row[key] = prefs[key]!;
    }
    if (body.language) row.language = body.language;
    if (body.email !== undefined) row.email = body.email;
    await this.settingRepo.save(row);
    return this.toSettings(row, parent);
  }

  private async linkedStudents(parent: Parent) {
    const links = await this.linkRepo.find({
      where: { parent: { id: parent.id } },
      relations: ['student', 'student.user', 'student.institute'],
      order: { id: 'ASC' },
    });
    return links
      .map((link) => link.student)
      .filter(
        (student) =>
          student && student.institute_id === parent.institute?.id,
      );
  }

  private async assertLinkedChild(parent: Parent, childId: number) {
    const students = await this.linkedStudents(parent);
    const student = students.find((row) => row.id === childId);
    if (!student) {
      throw new ForbiddenException('You can only access your linked children');
    }
    return student;
  }

  private toChildRow(student: Student) {
    return {
      id: `stu_${student.id}`,
      name: student.name,
      avatar: student.avatar_id,
      grade: student.grade,
      class_name: student.grade ? `Class ${normalizeGrade(student.grade)}` : null,
    };
  }

  private foundationScore(
    subjects: StudentSubjectProgress[],
    summary: StudentDashboardSummary | null,
  ) {
    if (subjects.length) {
      return average(subjects.map((row) => row.progress_percent));
    }
    if (summary?.games_played) {
      return Math.round((summary.games_won / summary.games_played) * 100);
    }
    return 0;
  }

  private foundationSummary(name: string, score: number) {
    if (score >= 75) return `${name} is doing well across core skills.`;
    if (score >= 45) return `${name} is making progress and needs steady practice.`;
    return `${name} needs gentle support with the basics this week.`;
  }

  private aiInsights(subjects: StudentSubjectProgress[]) {
    const ordered = [...subjects].sort((a, b) => b.progress_percent - a.progress_percent);
    const strengths = ordered
      .filter((row) => row.progress_percent >= 70)
      .slice(0, 3)
      .map((row) => `${row.subject} is becoming a strong area.`);
    const areas = ordered
      .filter((row) => row.progress_percent < 60)
      .reverse()
      .slice(0, 3)
      .map((row) => `${row.subject} may need extra practice.`);

    return {
      strengths: strengths.length ? strengths : ['Your child is building learning habits.'],
      areas_to_improve: areas,
      suggested_focus: areas.length
        ? areas.map((text) => text.replace('may need extra practice.', 'practice for 10 minutes daily.'))
        : ['Keep the current routine steady this week.'],
    };
  }

  private celebrations(badges: StudentBadge[], rewards: StudentReward[]) {
    return [
      ...badges.map((badge) => ({
        title: badge.title,
        description: badge.description ?? 'New badge earned.',
        icon: 'award',
        time: formatRelative(badge.earned_at),
        color: '#7c3aed',
      })),
      ...rewards.map((reward) => ({
        title: reward.title,
        description: `${reward.points} points earned.`,
        icon: reward.type === 'badge' ? 'award' : 'star',
        time: formatRelative(reward.earned_at),
        color: '#16a34a',
      })),
    ].slice(0, 5);
  }

  private weeklyAchievements(logs: StudentActivityLog[]) {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - offset));
      const lessons = logs.filter((log) => sameDay(log.created_at, date)).length;
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        lessons,
        icon: lessons > 0 ? 'check-circle' : 'circle',
      };
    });
  }

  private activityDays(logs: StudentActivityLog[]) {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - offset));
      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        active: logs.some((log) => sameDay(log.created_at, date)),
      };
    });
  }

  private async ensureSafetyDefaults(parent: Parent, student: Student) {
    const existing = await this.safetyRepo.find({
      where: { parent: { id: parent.id }, student: { id: student.id } },
    });
    const existingKeys = new Set(existing.map((row) => row.key));
    for (const item of SAFETY_DEFAULTS) {
      if (!existingKeys.has(item.key)) {
        await this.safetyRepo.save(
          this.safetyRepo.create({
            parent,
            student,
            ...item,
            value: item.enabled ? 'enabled' : 'disabled',
          }),
        );
      }
    }
  }

  private async getOrCreateSettings(parent: Parent) {
    const existing = await this.settingRepo.findOne({
      where: { parent: { id: parent.id } },
    });
    if (existing) return existing;
    return this.settingRepo.save(
      this.settingRepo.create({
        parent,
        email: parent.email,
      }),
    );
  }

  private toSettings(row: ParentSetting, parent: Parent) {
    return {
      notification_preferences: {
        progress_notifications: row.progress_notifications,
        weekly_reports: row.weekly_reports,
        safety_alerts: row.safety_alerts,
      },
      email: row.email ?? parent.email,
      language: row.language,
    };
  }
}

function parseDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function sameDay(left: Date | string, right: Date) {
  const date = parseDate(left);
  return date.toDateString() === right.toDateString();
}

function average(values: number[]) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return 0;
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

function normalizeGrade(grade: string) {
  return grade.replace(/^class\s*/i, '').replace(/^grade\s*/i, '').trim();
}

function formatRelative(value: Date | string) {
  const date = parseDate(value);
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} mins ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  return `${Math.floor(sec / 86400)} days ago`;
}
