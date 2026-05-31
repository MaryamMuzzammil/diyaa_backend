import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ClassSection } from '../institute/entities/class-section.entity';
import { Student } from '../student/student.entity';
import { UserRole } from '../users/users.entity';
import { ClassStudentEnrollment } from './entities/class-student-enrollment.entity';
import { TeacherClassAssignment } from './entities/teacher-class-assignment.entity';
import { Teacher } from './teacher.entity';
import { formatClassLabel, formatClassName } from './utils/teacher-format.util';

type Actor = { sub: number; email: string; role: UserRole };

@Injectable()
export class TeacherScopeService {
  constructor(
    @InjectRepository(Teacher)
    private teacherRepo: Repository<Teacher>,
    @InjectRepository(ClassSection)
    private classRepo: Repository<ClassSection>,
    @InjectRepository(TeacherClassAssignment)
    private assignmentRepo: Repository<TeacherClassAssignment>,
    @InjectRepository(ClassStudentEnrollment)
    private enrollmentRepo: Repository<ClassStudentEnrollment>,
    @InjectRepository(Student)
    private studentRepo: Repository<Student>,
  ) {}

  async getTeacherForActor(actor: Actor): Promise<Teacher> {
    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException('Only teachers can access this resource');
    }
    const teacher = await this.teacherRepo.findOne({
      where: { user: { user_id: actor.sub } },
      relations: ['user', 'institute'],
    });
    if (!teacher) {
      throw new NotFoundException(
        'Teacher profile not found. Contact your school administrator.',
      );
    }
    return teacher;
  }

  async syncLegacyClassAssignments(teacher: Teacher): Promise<void> {
    const instituteId = teacher.institute?.id;
    if (!instituteId) return;

    const classes = await this.classRepo.find({
      where: { institute: { id: instituteId } },
    });

    const name = teacher.name.trim().toLowerCase();
    for (const section of classes) {
      const names = (section.teacher_names ?? []).map((n) =>
        n.trim().toLowerCase(),
      );
      if (!names.includes(name)) continue;

      const exists = await this.assignmentRepo.findOne({
        where: {
          teacher: { id: teacher.id },
          class_section: { id: section.id },
        },
      });
      if (!exists) {
        await this.assignmentRepo.save(
          this.assignmentRepo.create({
            teacher,
            class_section: section,
            subjects: teacher.subjects,
          }),
        );
      }
    }
  }

  async getAssignedClasses(teacher: Teacher): Promise<ClassSection[]> {
    await this.syncLegacyClassAssignments(teacher);

    const links = await this.assignmentRepo.find({
      where: { teacher: { id: teacher.id } },
      relations: ['class_section', 'class_section.institute'],
    });

    if (links.length === 0) {
      return [];
    }

    const ids = links.map((l) => l.class_section.id);
    return this.classRepo.find({
      where: { id: In(ids) },
      relations: ['institute'],
      order: { grade: 'ASC', section: 'ASC' },
    });
  }

  async assertClassAssigned(
    teacher: Teacher,
    classSectionId: number,
  ): Promise<ClassSection> {
    const classes = await this.getAssignedClasses(teacher);
    const section = classes.find((c) => c.id === classSectionId);
    if (!section) {
      throw new ForbiddenException(
        'You are not assigned to this class',
      );
    }
    return section;
  }

  async getScopedStudents(teacher: Teacher): Promise<Student[]> {
    const classes = await this.getAssignedClasses(teacher);
    if (classes.length === 0) return [];

    const instituteId = teacher.institute?.id;
    if (!instituteId) return [];

    const classIds = classes.map((c) => c.id);
    const enrollments = await this.enrollmentRepo.find({
      where: { class_section: { id: In(classIds) } },
      relations: ['student', 'student.user'],
    });

    if (enrollments.length > 0) {
      const byId = new Map<number, Student>();
      for (const e of enrollments) {
        if (e.student) byId.set(e.student.id, e.student);
      }
      return [...byId.values()];
    }

    const students = await this.studentRepo.find({
      where: { institute_id: instituteId },
      relations: ['user'],
    });

    return students.filter((s) =>
      classes.some(
        (c) =>
          this.normalizeGrade(s.grade) === this.normalizeGrade(c.grade) &&
          (s.branch ?? 'Main Campus') === (c.branch ?? 'Main Campus'),
      ),
    );
  }

  async assertStudentInScope(
    teacher: Teacher,
    studentId: number,
  ): Promise<Student> {
    const students = await this.getScopedStudents(teacher);
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      throw new ForbiddenException('Student is not in your assigned classes');
    }
    return student;
  }

  buildTeacherProfile(teacher: Teacher, classes: ClassSection[]) {
    const assigned_classes = classes.map((c) =>
      formatClassName(c.grade, c.section),
    );
    const assigned_grades = [
      ...new Set(classes.map((c) => this.formatGradeLabel(c.grade))),
    ];

    return {
      user_id: teacher.user?.user_id,
      name: teacher.name,
      email: teacher.email,
      role: 'Teacher' as const,
      institute_id: teacher.institute?.id ?? null,
      branch: teacher.branch,
      subjects: teacher.subjects ?? [],
      assigned_grades,
      assigned_classes,
      status: teacher.status,
    };
  }

  formatAssignedClassRow(section: ClassSection) {
    return {
      class_id: section.id,
      grade: section.grade,
      section: section.section,
      branch: section.branch,
      class_name: formatClassName(section.grade, section.section),
      class_label: formatClassLabel(
        section.grade,
        section.section,
        section.branch,
      ),
      student_count: section.student_count,
      teachers: section.teacher_names ?? [],
    };
  }

  private normalizeGrade(grade: string | null | undefined): string {
    if (!grade) return '';
    return grade.replace(/^grade\s*/i, '').trim();
  }

  private formatGradeLabel(grade: string): string {
    const g = grade.trim();
    return /^grade/i.test(g) ? g : `Grade ${g}`;
  }
}
