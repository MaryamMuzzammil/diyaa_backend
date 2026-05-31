import { Injectable } from '@nestjs/common';
import { InstituteAdminService } from '../institute-admin/institute-admin.service';
import { InstituteAdmin } from '../institute-admin/institute-admin.entity';
import { ParentService } from '../parent/parent.service';
import { Parent } from '../parent/parent.entity';
import { StudentService } from '../student/student.service';
import { Student } from '../student/student.entity';
import { TeacherService } from '../teacher/teacher.service';
import { Teacher } from '../teacher/teacher.entity';
import { User, UserRole } from '../users/users.entity';
import { CreateInstituteUserDto } from './dto/create-institute-user.dto';
import { Institute } from './institute.entity';

export type InstituteMemberRecord =
  | Student
  | Teacher
  | Parent
  | InstituteAdmin
  | null;

@Injectable()
export class InstituteMembersService {
  constructor(
    private studentService: StudentService,
    private teacherService: TeacherService,
    private parentService: ParentService,
    private instituteAdminService: InstituteAdminService,
  ) {}

  async createForUser(
    user: User,
    institute: Institute,
    dto: CreateInstituteUserDto,
  ): Promise<InstituteMemberRecord> {
    switch (user.role) {
      case UserRole.STUDENT:
        return this.studentService.create(user, institute ?? null, dto);
      case UserRole.TEACHER:
        return this.teacherService.create(user, institute, dto);
      case UserRole.PARENT:
        return this.parentService.create(user, institute, dto);
      case UserRole.ADMIN:
        return this.instituteAdminService.create(user, institute, dto);
      default:
        return null;
    }
  }

  async createFromUser(user: User, institute: Institute) {
    return this.createForUser(user, institute, {
      email: user.email,
      password: '',
      name: user.name,
      phone: user.phone ?? undefined,
      grade: user.grade ?? undefined,
      branch: user.branch ?? undefined,
    });
  }

  async deleteAllForUser(userId: number) {
    await Promise.all([
      this.studentService.deleteForUser(userId),
      this.teacherService.deleteForUser(userId),
      this.parentService.deleteForUser(userId),
      this.instituteAdminService.deleteForUser(userId),
    ]);
  }

  async replaceOnRoleChange(
    user: User,
    institute: Institute,
    dto: CreateInstituteUserDto,
  ) {
    await this.deleteAllForUser(user.user_id);
    return this.createForUser(user, institute, dto);
  }

  async syncStatus(user: User) {
    await Promise.all([
      this.studentService.syncFromUser(user),
      this.teacherService.syncFromUser(user),
      this.parentService.syncFromUser(user),
      this.instituteAdminService.syncFromUser(user),
    ]);
  }

  toPublicMember(
    role: UserRole,
    record: InstituteMemberRecord,
    instituteId?: number,
    userId?: number,
  ) {
    if (!record) return null;

    switch (role) {
      case UserRole.STUDENT:
        return this.studentService.toPublic(
          record as Student,
          instituteId,
          userId,
        );
      case UserRole.TEACHER:
        return this.teacherService.toPublic(
          record as Teacher,
          instituteId,
          userId,
        );
      case UserRole.PARENT:
        return this.parentService.toPublic(
          record as Parent,
          instituteId,
          userId,
        );
      case UserRole.ADMIN:
        return this.instituteAdminService.toPublic(
          record as InstituteAdmin,
          instituteId,
          userId,
        );
      default:
        return null;
    }
  }
}
