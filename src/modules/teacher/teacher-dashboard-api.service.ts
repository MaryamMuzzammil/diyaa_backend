import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClassSection } from '../institute/entities/class-section.entity';
import { StudentActivityLog } from '../student/entities/student-activity-log.entity';
import { StudentBadge } from '../student/entities/student-badge.entity';
import { StudentDashboardSummary } from '../student/entities/student-dashboard-summary.entity';
import { StudentLevelProgress } from '../student/entities/student-level-progress.entity';
import { StudentSubjectProgress } from '../student/entities/student-subject-progress.entity';
import { Student } from '../student/student.entity';
import { TeacherClassAssignment } from './entities/teacher-class-assignment.entity';
import { TeacherContent } from './entities/teacher-content.entity';
import { TeacherGroupMember } from './entities/teacher-group-member.entity';
import { TeacherLiveClass } from './entities/teacher-live-class.entity';
import { TeacherNotificationSetting } from './entities/teacher-notification-setting.entity';
import { TeacherStudentGroup } from './entities/teacher-student-group.entity';
import { Teacher } from './teacher.entity';
import { TeacherScopeService } from './teacher-scope.service';
import { formatClassName } from './utils/teacher-format.util';

type CreateContentBody = {
  classId: string;
  sectionId: string;
  subjectId: string;
  type: string;
  title: string;
  description?: string;
};

type AssignTargetBody = {
  classId: string;
  sectionId: string;
  subjectId: string;
};

type GenerateContentBody = AssignTargetBody & {
  topic: string;
  difficulty: string;
  contentType: string;
};

type SaveGeneratedContentBody = GenerateContentBody & {
  title: string;
  body: string;
  questions?: unknown[];
};

@Injectable()
export class TeacherDashboardApiService {
  constructor(
    @InjectRepository(TeacherClassAssignment)
    private assignmentRepo: Repository<TeacherClassAssignment>,
    @InjectRepository(TeacherContent)
    private contentRepo: Repository<TeacherContent>,
    @InjectRepository(TeacherStudentGroup)
    private groupRepo: Repository<TeacherStudentGroup>,
    @InjectRepository(TeacherGroupMember)
    private memberRepo: Repository<TeacherGroupMember>,
    @InjectRepository(TeacherLiveClass)
    private liveClassRepo: Repository<TeacherLiveClass>,
    @InjectRepository(TeacherNotificationSetting)
    private settingsRepo: Repository<TeacherNotificationSetting>,
    @InjectRepository(Teacher)
    private teacherRepo: Repository<Teacher>,
    @InjectRepository(StudentDashboardSummary)
    private summaryRepo: Repository<StudentDashboardSummary>,
    @InjectRepository(StudentSubjectProgress)
    private subjectProgressRepo: Repository<StudentSubjectProgress>,
    @InjectRepository(StudentLevelProgress)
    private levelProgressRepo: Repository<StudentLevelProgress>,
    @InjectRepository(StudentActivityLog)
    private activityRepo: Repository<StudentActivityLog>,
    @InjectRepository(StudentBadge)
    private badgeRepo: Repository<StudentBadge>,
    private scope: TeacherScopeService,
  ) {}

  async getAssignedClasses(teacher: Teacher) {
    const links = await this.getAssignmentLinks(teacher);
    return links.map((link) => {
      const section = link.class_section;
      const subjects = this.resolveSubjects(link, teacher);
      return {
        id: this.classId(section),
        name: this.gradeName(section.grade),
        grade: this.gradeName(section.grade),
        sections: [{ id: this.sectionId(section.section), name: section.section }],
        subjects: subjects.map((subject) => ({
          id: this.subjectId(subject),
          name: subject,
        })),
      };
    });
  }

  async listContent(teacher: Teacher) {
    const rows = await this.contentRepo.find({
      where: { teacher: { id: teacher.id } },
      relations: ['class_section'],
      order: { created_at: 'DESC' },
    });
    return rows.map((row) => this.toContentRow(row));
  }

  async createContent(teacher: Teacher, body: CreateContentBody) {
    const target = await this.assertTarget(teacher, body);
    const row = await this.contentRepo.save(
      this.contentRepo.create({
        teacher,
        class_section: target.section,
        subject: target.subject,
        type: body.type,
        title: body.title.trim(),
        description: body.description ?? null,
        body: null,
        questions: null,
      }),
    );
    return this.toContentRow(row);
  }

  async assignContent(teacher: Teacher, id: number, body: AssignTargetBody) {
    const target = await this.assertTarget(teacher, body);
    const row = await this.getOwnedContent(teacher, id);
    row.class_section = target.section;
    row.subject = target.subject;
    row.assigned = true;
    row.assigned_student_count = (
      await this.studentsForSection(teacher, target.section)
    ).length;
    await this.contentRepo.save(row);
    return { id: row.id, content_id: row.id, assigned_student_count: row.assigned_student_count };
  }

  async generateContent(teacher: Teacher, body: GenerateContentBody) {
    const target = await this.assertTarget(teacher, body);
    return {
      title: `${body.topic} ${body.contentType}`,
      body: `Generated editable ${body.contentType.toLowerCase()} for ${this.gradeName(
        target.section.grade,
      )} ${target.subject}. Topic: ${body.topic}. Difficulty: ${body.difficulty}.`,
      questions:
        body.contentType.toLowerCase() === 'quiz'
          ? [
              {
                question: `What is one key idea in ${body.topic}?`,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                answer: 'Option A',
              },
            ]
          : [],
    };
  }

  async saveGeneratedContent(teacher: Teacher, body: SaveGeneratedContentBody) {
    const target = await this.assertTarget(teacher, body);
    const row = await this.contentRepo.save(
      this.contentRepo.create({
        teacher,
        class_section: target.section,
        subject: target.subject,
        type: body.contentType,
        title: body.title.trim(),
        description: null,
        body: body.body,
        questions: body.questions ?? [],
        topic: body.topic,
        difficulty: body.difficulty,
      }),
    );
    return this.toContentRow(row);
  }

  async listStudentPerformance(
    teacher: Teacher,
    query: {
      classId?: string;
      sectionId?: string;
      subjectId?: string;
      status?: string;
    },
  ) {
    const target = await this.optionalTarget(teacher, query);
    const students = target
      ? await this.studentsForSection(teacher, target.section)
      : await this.scope.getScopedStudents(teacher);
    const filtered = query.status
      ? students.filter((s) => s.status.toLowerCase() === query.status!.toLowerCase())
      : students;
    return this.performanceRows(filtered, target?.subject);
  }

  async getStudentPerformance(teacher: Teacher, studentId: number) {
    const student = await this.scope.assertStudentInScope(teacher, studentId);
    const rows = await this.performanceRows([student]);
    if (!rows[0]) throw new NotFoundException('Performance not found');
    return rows[0];
  }

  async classSummary(teacher: Teacher, query: AssignTargetBody) {
    const target = await this.assertTarget(teacher, query);
    const rows = await this.performanceRows(
      await this.studentsForSection(teacher, target.section),
      target.subject,
    );
    const avg = average(rows.map((r) => r.subject_average));
    return {
      class_average: avg,
      subject_average: avg,
      daily_active_students: rows.filter((r) => r.time_spent_today_minutes > 0).length,
      quiz_completion_rate: rows.length ? 76 : 0,
      assignment_submission_rate: rows.length ? 69 : 0,
      average_time_minutes: average(rows.map((r) => r.time_spent_today_minutes)),
      performance_growth_text: rows.length ? '+12%' : '0%',
      subject_performance: [{ subject: target.subject, average_score: avg }],
    };
  }

  async topicWeakness(teacher: Teacher, query: AssignTargetBody) {
    await this.assertTarget(teacher, query);
    return [
      { topic: 'Fractions', student_count: 4, average_score: 58 },
      { topic: 'Time', student_count: 3, average_score: 62 },
    ];
  }

  async activityTime(
    teacher: Teacher,
    query: AssignTargetBody & { range?: string },
  ) {
    const target = await this.assertTarget(teacher, query);
    const students = await this.studentsForSection(teacher, target.section);
    const ids = students.map((s) => s.id);
    if (ids.length === 0) return [];
    const logs = await this.activityRepo.find({
      where: { student: { id: In(ids) }, subject: target.subject },
      relations: ['student'],
      order: { created_at: 'DESC' },
      take: 100,
    });
    return logs.map((log) => ({
      student_id: log.student?.id,
      student_name: log.student?.name,
      minutes: log.duration_minutes,
      activity_type: log.activity_type,
      created_at: log.created_at,
    }));
  }

  async addGroupStudents(teacher: Teacher, groupId: number, body: { student_ids?: number[]; studentIds?: number[] }) {
    const group = await this.getOwnedGroup(teacher, groupId);
    const ids = body.student_ids ?? body.studentIds ?? [];
    for (const id of ids) {
      const student = await this.scope.assertStudentInScope(teacher, id);
      const exists = await this.memberRepo.findOne({
        where: { group: { id: group.id }, student: { id: student.id } },
      });
      if (!exists) {
        await this.memberRepo.save(this.memberRepo.create({ group, student }));
      }
    }
    return this.toGroupRow(
      (await this.groupRepo.findOne({
        where: { id: group.id },
        relations: ['members', 'members.student', 'class_section'],
      }))!,
    );
  }

  async assignContentToGroup(teacher: Teacher, groupId: number, body: { contentId?: number; content_id?: number }) {
    const group = await this.getOwnedGroup(teacher, groupId);
    const contentId = body.contentId ?? body.content_id;
    if (!contentId) throw new BadRequestException('contentId is required');
    await this.getOwnedContent(teacher, contentId);
    return { group_id: group.id, content_id: contentId, assigned: true };
  }

  async createLiveClass(teacher: Teacher, body: AssignTargetBody & { title: string }) {
    const target = await this.assertTarget(teacher, body);
    const row = await this.liveClassRepo.save(
      this.liveClassRepo.create({
        teacher,
        class_section: target.section,
        subject: target.subject,
        title: body.title.trim(),
        status: 'active',
        ended_at: null,
      }),
    );
    return this.toLiveClassRow(row);
  }

  async listLiveClasses(teacher: Teacher) {
    const rows = await this.liveClassRepo.find({
      where: { teacher: { id: teacher.id } },
      relations: ['class_section'],
      order: { started_at: 'DESC' },
    });
    return rows.map((row) => this.toLiveClassRow(row));
  }

  async endLiveClass(teacher: Teacher, id: number) {
    const row = await this.getOwnedLiveClass(teacher, id);
    row.status = 'ended';
    row.ended_at = new Date();
    await this.liveClassRepo.save(row);
    return this.toLiveClassRow(row);
  }

  async liveClassAttendance(teacher: Teacher, id: number) {
    const row = await this.getOwnedLiveClass(teacher, id);
    const students = await this.studentsForSection(teacher, row.class_section);
    return students.map((student) => ({
      student_id: this.studentId(student),
      student_name: student.name,
      status: student.last_login_at && student.last_login_at >= row.started_at ? 'present' : 'absent',
      joined_at:
        student.last_login_at && student.last_login_at >= row.started_at
          ? student.last_login_at
          : null,
    }));
  }

  async leaderboard(teacher: Teacher, query: AssignTargetBody) {
    const target = await this.assertTarget(teacher, query);
    const students = await this.studentsForSection(teacher, target.section);
    const ids = students.map((s) => s.id);
    if (ids.length === 0) return [];
    const summaries = await this.summaryRepo.find({
      where: { student: { id: In(ids) } },
      relations: ['student'],
    });
    const badges = await this.badgeCounts(ids);
    return summaries
      .map((summary) => ({
        student_id: this.studentId(summary.student),
        student_name: summary.student.name,
        xp: summary.total_xp,
        level: Math.max(1, Math.floor(summary.total_xp / 150) + 1),
        badges: badges.get(summary.student.id) ?? 0,
        streak_days: summary.current_streak,
      }))
      .sort((a, b) => b.xp - a.xp);
  }

  async studentLevels(teacher: Teacher, studentId: number) {
    const student = await this.scope.assertStudentInScope(teacher, studentId);
    const rows = await this.levelProgressRepo.find({
      where: { student: { id: student.id } },
      order: { subject: 'ASC', level_number: 'ASC' },
    });
    return rows.map((row) => ({
      subject: row.subject,
      level_number: row.level_number,
      status: row.status,
      total_score: row.total_score,
      games_completed: row.games_completed,
      games_total: row.games_total,
      completed_at: row.completed_at,
    }));
  }

  async awardBadge(teacher: Teacher, studentId: number, body: { badge_id: string; reason?: string }) {
    const student = await this.scope.assertStudentInScope(teacher, studentId);
    const badge = await this.badgeRepo.save(
      this.badgeRepo.create({
        student,
        badge_key: body.badge_id,
        title: titleize(body.badge_id),
        description: body.reason ?? null,
      }),
    );
    return { badge_id: badge.badge_key, student_id: this.studentId(student), reason: badge.description };
  }

  async profile(teacher: Teacher) {
    const classes = await this.scope.getAssignedClasses(teacher);
    return {
      id: `teacher_${teacher.id}`,
      name: teacher.name,
      email: teacher.email,
      branch: teacher.branch,
      subjects: teacher.subjects ?? [],
      assigned_grades: [...new Set(classes.map((c) => this.gradeName(c.grade)))],
    };
  }

  async updateProfile(teacher: Teacher, body: { name?: string; branch?: string; phone?: string }) {
    if (body.name) teacher.name = body.name.trim();
    if (body.branch) teacher.branch = body.branch.trim();
    if (body.phone !== undefined) teacher.phone = body.phone;
    await this.teacherRepo.save(teacher);
    return this.profile(teacher);
  }

  async notificationSettings(teacher: Teacher) {
    const row = await this.getOrCreateSettings(teacher);
    return this.toSettings(row);
  }

  async updateNotificationSettings(
    teacher: Teacher,
    body: Partial<TeacherNotificationSetting>,
  ) {
    const row = await this.getOrCreateSettings(teacher);
    for (const key of [
      'student_submissions',
      'low_performance_alerts',
      'weekly_reports',
      'ai_suggestions',
    ] as const) {
      if (typeof body[key] === 'boolean') row[key] = body[key]!;
    }
    await this.settingsRepo.save(row);
    return this.toSettings(row);
  }

  private async assertTarget(teacher: Teacher, body: Partial<AssignTargetBody>) {
    if (!body.classId || !body.sectionId || !body.subjectId) {
      throw new BadRequestException('classId, sectionId, and subjectId are required');
    }
    const section = await this.scope.assertClassAssigned(
      teacher,
      this.parseClassId(body.classId),
    );
    if (this.sectionId(section.section) !== body.sectionId) {
      throw new ForbiddenException('You are not assigned to this section');
    }
    const subject = await this.assertSubjectAssigned(teacher, section, body.subjectId);
    return { section, subject };
  }

  private async optionalTarget(
    teacher: Teacher,
    query: Partial<AssignTargetBody>,
  ) {
    if (!query.classId && !query.sectionId && !query.subjectId) return null;
    return this.assertTarget(teacher, query);
  }

  private async assertSubjectAssigned(
    teacher: Teacher,
    section: ClassSection,
    rawSubjectId: string,
  ) {
    const link = await this.assignmentRepo.findOne({
      where: { teacher: { id: teacher.id }, class_section: { id: section.id } },
      relations: ['class_section'],
    });
    const subjects = this.resolveSubjects(link ?? undefined, teacher);
    const subject = subjects.find((s) => this.subjectId(s) === rawSubjectId);
    if (!subject) throw new ForbiddenException('You are not assigned to this subject');
    return subject;
  }

  private async getAssignmentLinks(teacher: Teacher) {
    await this.scope.syncLegacyClassAssignments(teacher);
    return this.assignmentRepo.find({
      where: { teacher: { id: teacher.id } },
      relations: ['class_section'],
      order: { class_section: { grade: 'ASC', section: 'ASC' } },
    });
  }

  private resolveSubjects(link: TeacherClassAssignment | undefined, teacher: Teacher) {
    return link?.subjects?.length ? link.subjects : teacher.subjects?.length ? teacher.subjects : [];
  }

  private async performanceRows(students: Student[], subject?: string) {
    const ids = students.map((s) => s.id);
    if (ids.length === 0) return [];
    const [summaries, progress] = await Promise.all([
      this.summaryRepo.find({ where: { student: { id: In(ids) } }, relations: ['student'] }),
      this.subjectProgressRepo.find({ where: { student: { id: In(ids) } }, relations: ['student'] }),
    ]);
    const summaryByStudent = new Map(summaries.map((s) => [s.student.id, s]));
    const progressByStudent = new Map<number, StudentSubjectProgress[]>();
    for (const row of progress) {
      if (subject && row.subject.toLowerCase() !== subject.toLowerCase()) continue;
      const bucket = progressByStudent.get(row.student.id) ?? [];
      bucket.push(row);
      progressByStudent.set(row.student.id, bucket);
    }
    return students.map((student) => {
      const subjectRows = progressByStudent.get(student.id) ?? [];
      const summary = summaryByStudent.get(student.id);
      const avg = average(subjectRows.map((r) => r.total_score || r.progress_percent));
      return {
        student_id: this.studentId(student),
        student_name: student.name,
        class_name: this.gradeName(student.grade ?? ''),
        section_name: student.branch ?? 'A',
        subject: subject ?? subjectRows[0]?.subject ?? '',
        subject_average: avg,
        completed_tasks: summary?.lessons_completed ?? 0,
        pending_tasks: Math.max(0, 5 - (summary?.lessons_completed ?? 0)),
        levels_completed: subjectRows.reduce((n, r) => n + r.levels_completed, 0),
        time_spent_today_minutes: summary?.today_minutes ?? 0,
        weak_topics: avg && avg < 60 ? ['Fractions', 'Time'] : [],
      };
    });
  }

  private async studentsForSection(teacher: Teacher, section: ClassSection) {
    const students = await this.scope.getScopedStudents(teacher);
    return students.filter(
      (student) =>
        normalizeGrade(student.grade) === normalizeGrade(section.grade) &&
        (student.branch ?? 'Main Campus') === (section.branch ?? 'Main Campus'),
    );
  }

  private async badgeCounts(studentIds: number[]) {
    const rows = await this.badgeRepo.find({
      where: { student: { id: In(studentIds) } },
      relations: ['student'],
    });
    const map = new Map<number, number>();
    for (const row of rows) map.set(row.student.id, (map.get(row.student.id) ?? 0) + 1);
    return map;
  }

  private async getOwnedContent(teacher: Teacher, id: number) {
    const row = await this.contentRepo.findOne({
      where: { id, teacher: { id: teacher.id } },
      relations: ['class_section'],
    });
    if (!row) throw new NotFoundException('Content not found');
    return row;
  }

  private async getOwnedGroup(teacher: Teacher, id: number) {
    const row = await this.groupRepo.findOne({
      where: { id, teacher: { id: teacher.id } },
      relations: ['class_section', 'members', 'members.student'],
    });
    if (!row) throw new NotFoundException('Group not found');
    return row;
  }

  private async getOwnedLiveClass(teacher: Teacher, id: number) {
    const row = await this.liveClassRepo.findOne({
      where: { id, teacher: { id: teacher.id } },
      relations: ['class_section'],
    });
    if (!row) throw new NotFoundException('Live class not found');
    return row;
  }

  private async getOrCreateSettings(teacher: Teacher) {
    const existing = await this.settingsRepo.findOne({
      where: { teacher: { id: teacher.id } },
    });
    if (existing) return existing;
    return this.settingsRepo.save(this.settingsRepo.create({ teacher }));
  }

  private toContentRow(row: TeacherContent) {
    return {
      id: row.id,
      content_id: row.id,
      class_id: row.class_section ? this.classId(row.class_section) : null,
      section_id: row.class_section ? this.sectionId(row.class_section.section) : null,
      subject_id: this.subjectId(row.subject),
      subject: row.subject,
      type: row.type,
      title: row.title,
      description: row.description,
      body: row.body,
      questions: row.questions ?? [],
      topic: row.topic,
      difficulty: row.difficulty,
      assigned: row.assigned,
      assigned_student_count: row.assigned_student_count,
      created_at: row.created_at,
    };
  }

  private toGroupRow(group: TeacherStudentGroup) {
    return {
      id: `grp_${group.id}`,
      group_id: group.id,
      name: group.name,
      student_count: group.members?.length ?? 0,
      students:
        group.members?.map((member) => ({
          student_id: this.studentId(member.student),
          student_name: member.student.name,
        })) ?? [],
    };
  }

  private toLiveClassRow(row: TeacherLiveClass) {
    return {
      id: `live_${row.id}`,
      class_id: row.class_section ? this.classId(row.class_section) : null,
      section_id: row.class_section ? this.sectionId(row.class_section.section) : null,
      subject_id: this.subjectId(row.subject),
      title: row.title,
      status: row.status,
      started_at: row.started_at,
      ended_at: row.ended_at,
    };
  }

  private toSettings(row: TeacherNotificationSetting) {
    return {
      student_submissions: row.student_submissions,
      low_performance_alerts: row.low_performance_alerts,
      weekly_reports: row.weekly_reports,
      ai_suggestions: row.ai_suggestions,
    };
  }

  private parseClassId(value: string) {
    const match = /^class_(\d+)$/i.exec(value);
    if (!match) throw new BadRequestException('classId must look like class_1');
    return Number(match[1]);
  }

  private classId(section: ClassSection) {
    return `class_${section.id}`;
  }

  private sectionId(section: string) {
    return `sec_${section.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  }

  private subjectId(subject: string) {
    return `sub_${subject.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  }

  private studentId(student: Student) {
    return `stu_${student.id}`;
  }

  private gradeName(grade: string) {
    return formatClassName(grade, '').trim();
  }
}

function average(values: number[]) {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) return 0;
  return Math.round(filtered.reduce((a, b) => a + b, 0) / filtered.length);
}

function normalizeGrade(grade: string | null | undefined) {
  return (grade ?? '').replace(/^grade\s*/i, '').trim();
}

function titleize(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
