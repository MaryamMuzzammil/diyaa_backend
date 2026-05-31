import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StudentActivityLog } from '../student/entities/student-activity-log.entity';
import { StudentBadge } from '../student/entities/student-badge.entity';
import { StudentDashboardSummary } from '../student/entities/student-dashboard-summary.entity';
import { StudentSubjectProgress } from '../student/entities/student-subject-progress.entity';
import { Student } from '../student/student.entity';
import { UserRole } from '../users/users.entity';
import { TeacherNotification } from './entities/teacher-notification.entity';
import { Teacher } from './teacher.entity';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { TeacherGroupsService } from './teacher-groups.service';
import { TeacherRewardsService } from './teacher-rewards.service';
import { TeacherScopeService } from './teacher-scope.service';
import { formatLastActive, isActiveToday } from './utils/teacher-format.util';

type Actor = { sub: number; email: string; role: UserRole };

@Injectable()
export class TeacherDashboardService {
  constructor(
    @InjectRepository(StudentDashboardSummary)
    private summaryRepo: Repository<StudentDashboardSummary>,
    @InjectRepository(StudentSubjectProgress)
    private subjectProgressRepo: Repository<StudentSubjectProgress>,
    @InjectRepository(StudentBadge)
    private badgeRepo: Repository<StudentBadge>,
    @InjectRepository(StudentActivityLog)
    private activityRepo: Repository<StudentActivityLog>,
    @InjectRepository(TeacherNotification)
    private notificationRepo: Repository<TeacherNotification>,
    private scope: TeacherScopeService,
    private assignmentsService: TeacherAssignmentsService,
    private groupsService: TeacherGroupsService,
    private rewardsService: TeacherRewardsService,
  ) {}

  async getDashboard(actor: Actor) {
    const teacher = await this.scope.getTeacherForActor(actor);
    const classes = await this.scope.getAssignedClasses(teacher);
    const students = await this.scope.getScopedStudents(teacher);
    const studentIds = students.map((s) => s.id);

    const [
      summaries,
      subjectRows,
      badgeCounts,
      assignments,
      pendingReviews,
      groups,
      rewards,
      notifications,
      recentLogs,
    ] = await Promise.all([
      this.loadSummaries(studentIds),
      this.loadSubjectProgress(studentIds),
      this.loadBadgeCounts(studentIds),
      this.assignmentsService.listAssignments(teacher),
      this.assignmentsService.getPendingReviewsForDashboard(teacher),
      this.groupsService.listGroups(teacher),
      this.rewardsService.listRewardsForTeacher(teacher, studentIds),
      this.loadNotifications(teacher),
      this.loadRecentActivity(studentIds),
    ]);

    const summaryByStudent = new Map(
      summaries.map((s) => [s.student.id, s]),
    );
    const badgesByStudent = new Map(
      badgeCounts.map((b) => [b.studentId, b.count]),
    );

    const progressByStudent = this.groupProgressByStudent(subjectRows);
    const studentRows = students.map((s) =>
      this.toStudentRow(
        s,
        summaryByStudent.get(s.id),
        badgesByStudent.get(s.id),
        progressByStudent.get(s.id),
      ),
    );

    const overview = this.buildOverview(
      students,
      studentRows,
      assignments,
      subjectRows,
    );

    return {
      teacher: this.scope.buildTeacherProfile(teacher, classes),
      overview,
      assigned_classes: classes.map((c) =>
        this.scope.formatAssignedClassRow(c),
      ),
      students: studentRows,
      assignments,
      pending_reviews: pendingReviews,
      subject_performance: this.buildSubjectPerformance(
        subjectRows,
        teacher.subjects,
      ),
      top_students: this.buildTopStudents(studentRows),
      needs_attention: this.buildNeedsAttention(studentRows),
      recent_activity: recentLogs,
      groups,
      rewards,
      notifications,
    };
  }

  async listClasses(actor: Actor) {
    const teacher = await this.scope.getTeacherForActor(actor);
    const classes = await this.scope.getAssignedClasses(teacher);
    return classes.map((c) => this.scope.formatAssignedClassRow(c));
  }

  async listStudents(actor: Actor) {
    const teacher = await this.scope.getTeacherForActor(actor);
    const students = await this.scope.getScopedStudents(teacher);
    const ids = students.map((s) => s.id);
    const summaries = await this.loadSummaries(ids);
    const badgeCounts = await this.loadBadgeCounts(ids);
    const summaryByStudent = new Map(
      summaries.map((s) => [s.student.id, s]),
    );
    const badgesByStudent = new Map(
      badgeCounts.map((b) => [b.studentId, b.count]),
    );
    const subjectRows = await this.loadSubjectProgress(ids);
    const progressByStudent = this.groupProgressByStudent(subjectRows);
    return students.map((s) =>
      this.toStudentRow(
        s,
        summaryByStudent.get(s.id),
        badgesByStudent.get(s.id),
        progressByStudent.get(s.id),
      ),
    );
  }

  private groupProgressByStudent(rows: StudentSubjectProgress[]) {
    const map = new Map<number, number[]>();
    for (const r of rows) {
      const id = r.student.id;
      const list = map.get(id) ?? [];
      list.push(r.progress_percent);
      map.set(id, list);
    }
    return map;
  }

  private async loadSummaries(studentIds: number[]) {
    if (studentIds.length === 0) return [];
    return this.summaryRepo.find({
      where: { student: { id: In(studentIds) } },
      relations: ['student'],
    });
  }

  private async loadSubjectProgress(studentIds: number[]) {
    if (studentIds.length === 0) return [];
    return this.subjectProgressRepo.find({
      where: { student: { id: In(studentIds) } },
      relations: ['student'],
    });
  }

  private async loadBadgeCounts(studentIds: number[]) {
    if (studentIds.length === 0) return [];
    const rows = await this.badgeRepo
      .createQueryBuilder('b')
      .select('b.student_id', 'studentId')
      .addSelect('COUNT(*)', 'count')
      .where('b.student_id IN (:...ids)', { ids: studentIds })
      .groupBy('b.student_id')
      .getRawMany<{ studentId: string; count: string }>();

    return rows.map((r) => ({
      studentId: Number(r.studentId),
      count: Number(r.count),
    }));
  }

  private async loadNotifications(teacher: Teacher) {
    const rows = await this.notificationRepo.find({
      where: { teacher: { id: teacher.id } },
      order: { created_at: 'DESC' },
      take: 20,
    });
    return rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      read: n.read,
      created_at: n.created_at,
    }));
  }

  private async loadRecentActivity(studentIds: number[]) {
    if (studentIds.length === 0) return [];
    const logs = await this.activityRepo.find({
      where: { student: { id: In(studentIds) } },
      relations: ['student'],
      order: { created_at: 'DESC' },
      take: 30,
    });
    return logs.map((l) => ({
      student_id: l.student?.id,
      student_name: l.student?.name,
      activity_type: l.activity_type,
      subject: l.subject,
      level_number: l.level_number,
      skill: l.skill,
      score: l.score,
      won: l.won,
      created_at: l.created_at,
    }));
  }

  private toStudentRow(
    student: Student,
    summary?: StudentDashboardSummary,
    badges?: number,
    progressPercents?: number[],
  ) {
    const lastActive =
      student.last_login_at ?? student.user?.last_active_at ?? null;
    const overall_progress =
      progressPercents?.length
        ? Math.round(
            progressPercents.reduce((a, b) => a + b, 0) /
              progressPercents.length,
          )
        : 0;
    const average_score = summary?.games_won
      ? Math.round(summary.total_xp / Math.max(1, summary.games_won))
      : overall_progress;
    return {
      student_id: student.id,
      name: student.name,
      email: student.email,
      grade: student.grade,
      class_or_branch: student.branch,
      avatar_id: student.avatar_id,
      status: student.status,
      overall_progress,
      average_score,
      streak: summary?.current_streak ?? 0,
      badges: badges ?? 0,
      last_active: formatLastActive(lastActive),
    };
  }

  private buildOverview(
    students: Student[],
    studentRows: ReturnType<TeacherDashboardService['toStudentRow']>[],
    assignments: { pending_review: number }[],
    subjectRows: StudentSubjectProgress[],
  ) {
    const total = students.length;
    const activeToday = students.filter((s) =>
      isActiveToday(s.last_login_at ?? s.user?.last_active_at),
    ).length;
    const pending = assignments.reduce((n, a) => n + a.pending_review, 0);

    const percents = subjectRows.map((r) => r.progress_percent).filter(Boolean);
    const classAvg =
      percents.length > 0
        ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
        : 0;

    const engagement =
      total > 0 ? Math.round((activeToday / total) * 100) : 0;

    return {
      total_students: total,
      active_today: activeToday,
      pending_review: pending,
      class_average_percent: classAvg,
      students_change_text:
        total > 0 ? `+${Math.min(12, total)} this month` : 'No students yet',
      engagement_text: `${engagement}% engagement`,
      average_change_text: '+5% from last week',
    };
  }

  private buildSubjectPerformance(
    rows: StudentSubjectProgress[],
    teacherSubjects: string[] | null,
  ) {
    const filtered = teacherSubjects?.length
      ? rows.filter((r) =>
          teacherSubjects.some(
            (s) => s.toLowerCase() === r.subject.toLowerCase(),
          ),
        )
      : rows;

    const bySubject = new Map<
      string,
      { scores: number[]; progress: number[]; completed: number; total: number }
    >();

    for (const r of filtered) {
      const bucket = bySubject.get(r.subject) ?? {
        scores: [],
        progress: [],
        completed: 0,
        total: 0,
      };
      bucket.scores.push(r.total_score);
      bucket.progress.push(r.progress_percent);
      bucket.completed += r.levels_completed;
      bucket.total += r.levels_total;
      bySubject.set(r.subject, bucket);
    }

    return [...bySubject.entries()].map(([subject, data]) => ({
      subject,
      average_score:
        data.scores.length > 0
          ? Math.round(
              data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
            )
          : 0,
      engagement_percent:
        data.progress.length > 0
          ? Math.round(
              data.progress.reduce((a, b) => a + b, 0) / data.progress.length,
            )
          : 0,
      completed_lessons: data.completed,
      total_lessons: data.total,
    }));
  }

  private buildTopStudents(
    rows: ReturnType<TeacherDashboardService['toStudentRow']>[],
  ) {
    return [...rows]
      .sort((a, b) => b.average_score - a.average_score)
      .slice(0, 5)
      .map((s, i) => ({
        student_id: s.student_id,
        name: s.name,
        score: s.average_score,
        rank: i + 1,
        reason:
          i === 0 ? 'Top performer' : 'High quiz performance',
      }));
  }

  private buildNeedsAttention(
    rows: ReturnType<TeacherDashboardService['toStudentRow']>[],
  ) {
    return rows
      .filter((s) => {
        const inactive =
          s.last_active.includes('days ago') &&
          parseInt(s.last_active, 10) >= 5;
        return inactive || s.overall_progress < 40;
      })
      .slice(0, 10)
      .map((s) => ({
        student_id: s.student_id,
        name: s.name,
        risk_type:
          s.overall_progress < 40 ? 'low_progress' : 'inactive',
        reason:
          s.overall_progress < 40
            ? 'Progress below 40%'
            : `No activity — ${s.last_active}`,
        last_active: s.last_active,
      }));
  }
}
