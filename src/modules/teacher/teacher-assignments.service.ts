import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Student } from '../student/student.entity';
import { Teacher } from './teacher.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmissionFeedbackDto } from './dto/submission-feedback.dto';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { TeacherAssignment } from './entities/teacher-assignment.entity';
import { TeacherScopeService } from './teacher-scope.service';
import {
  formatClassLabel,
  formatClassName,
} from './utils/teacher-format.util';

@Injectable()
export class TeacherAssignmentsService {
  constructor(
    @InjectRepository(TeacherAssignment)
    private assignmentRepo: Repository<TeacherAssignment>,
    @InjectRepository(AssignmentSubmission)
    private submissionRepo: Repository<AssignmentSubmission>,
    private scope: TeacherScopeService,
  ) {}

  async listAssignments(teacher: Teacher) {
    const classIds = (await this.scope.getAssignedClasses(teacher)).map(
      (c) => c.id,
    );
    if (classIds.length === 0) return [];

    const rows = await this.assignmentRepo.find({
      where: { teacher: { id: teacher.id }, class_section: { id: In(classIds) } },
      relations: ['class_section', 'submissions', 'submissions.student'],
      order: { due_date: 'ASC' },
    });

    return rows.map((a) => this.toAssignmentRow(a));
  }

  async createAssignment(teacher: Teacher, dto: CreateAssignmentDto) {
    const section = await this.scope.assertClassAssigned(
      teacher,
      dto.class_section_id,
    );

    if (teacher.subjects?.length) {
      const subject = dto.subject.trim();
      const allowed = teacher.subjects.some(
        (s) => s.toLowerCase() === subject.toLowerCase(),
      );
      if (!allowed) {
        throw new ForbiddenException(
          `You can only create assignments for: ${teacher.subjects.join(', ')}`,
        );
      }
    }

    const assignment = await this.assignmentRepo.save(
      this.assignmentRepo.create({
        teacher,
        class_section: section,
        title: dto.title.trim(),
        subject: dto.subject.trim(),
        due_date: dto.due_date.slice(0, 10),
        status: dto.status ?? 'active',
      }),
    );

    const students = await this.scope.getScopedStudents(teacher);
    const classStudents = students.filter(
      (s) =>
        this.normalizeGrade(s.grade) ===
          this.normalizeGrade(section.grade) &&
        (s.branch ?? 'Main Campus') === (section.branch ?? 'Main Campus'),
    );

    for (const student of classStudents) {
      await this.submissionRepo.save(
        this.submissionRepo.create({
          assignment,
          student,
          status: 'not_submitted',
          ai_checked: false,
        }),
      );
    }

    const full = await this.assignmentRepo.findOne({
      where: { id: assignment.id },
      relations: ['class_section', 'submissions'],
    });
    return this.toAssignmentRow(full!);
  }

  async listPendingSubmissions(teacher: Teacher) {
    const assignments = await this.listAssignmentIds(teacher);
    if (assignments.length === 0) return [];

    const rows = await this.submissionRepo.find({
      where: {
        assignment: { id: In(assignments) },
        status: In(['pending_review', 'submitted']),
      },
      relations: ['assignment', 'assignment.class_section', 'student'],
      order: { submitted_at: 'DESC' },
    });

    return rows.map((s) => this.toSubmissionRow(s));
  }

  async updateSubmissionFeedback(
    teacher: Teacher,
    submissionId: number,
    dto: SubmissionFeedbackDto,
  ) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: [
        'assignment',
        'assignment.teacher',
        'assignment.class_section',
        'student',
      ],
    });
    if (!submission?.assignment) {
      throw new NotFoundException('Submission not found');
    }
    if (submission.assignment.teacher.id !== teacher.id) {
      throw new ForbiddenException('Not your submission');
    }

    if (dto.teacher_feedback != null) {
      submission.teacher_feedback = dto.teacher_feedback;
    }
    if (dto.score != null) {
      submission.score = dto.score;
    }
    submission.status = dto.status ?? 'graded';
    await this.submissionRepo.save(submission);

    return this.toSubmissionRow(submission);
  }

  async getPendingReviewsForDashboard(teacher: Teacher) {
    return this.listPendingSubmissions(teacher);
  }

  private async listAssignmentIds(teacher: Teacher): Promise<number[]> {
    const rows = await this.assignmentRepo.find({
      where: { teacher: { id: teacher.id } },
      select: ['id'],
    });
    return rows.map((r) => r.id);
  }

  private toAssignmentRow(a: TeacherAssignment) {
    const subs = a.submissions ?? [];
    const received = subs.filter(
      (s) => s.status !== 'not_submitted',
    ).length;
    const pending = subs.filter(
      (s) => s.status === 'pending_review' || s.status === 'submitted',
    ).length;

    const section = a.class_section;
    return {
      assignment_id: a.id,
      title: a.title,
      subject: a.subject,
      class_name: section
        ? formatClassLabel(section.grade, section.section, section.branch)
        : '',
      due_date: a.due_date,
      submissions_total: subs.length,
      submissions_received: received,
      pending_review: pending,
      status: a.status,
    };
  }

  private toSubmissionRow(s: AssignmentSubmission) {
    return {
      submission_id: s.id,
      assignment_id: s.assignment?.id,
      student_id: s.student?.id,
      student_name: s.student?.name,
      submitted_at: s.submitted_at,
      score: s.score,
      status: s.status,
      ai_checked: s.ai_checked,
      teacher_feedback: s.teacher_feedback,
    };
  }

  private normalizeGrade(grade: string | null | undefined): string {
    if (!grade) return '';
    return grade.replace(/^grade\s*/i, '').trim();
  }
}
