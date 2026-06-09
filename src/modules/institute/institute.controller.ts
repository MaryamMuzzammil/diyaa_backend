import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { REGISTRATION_OPTIONS } from './institute.constants';
import { AssignContentDto } from './dto/assign-content.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { CreateInstituteUserDto } from './dto/create-institute-user.dto';
import { RegisterInstituteDto } from './dto/register-institute.dto';
import { UpdateInstituteUserDto } from './dto/update-institute-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ParentService } from '../parent/parent.service';
import { StudentService } from '../student/student.service';
import { TeacherService } from '../teacher/teacher.service';
import { InstituteAccessService } from './institute-access.service';
import { InstituteDashboardService } from './institute-dashboard.service';
import { InstitutePermissionsService } from './institute-permissions.service';
import { InstituteService } from './institute.service';
import { UserRole } from '../users/users.entity';

type JwtActor = { sub: number; email: string; role: UserRole };

@Controller('institute')
export class InstituteController {
  constructor(
    private instituteService: InstituteService,
    private dashboardService: InstituteDashboardService,
    private permissionsService: InstitutePermissionsService,
    private access: InstituteAccessService,
    private studentService: StudentService,
    private teacherService: TeacherService,
    private parentService: ParentService,
  ) {}

  @Get('registration-options')
  getRegistrationOptions() {
    return REGISTRATION_OPTIONS;
  }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  register(@Body() body: RegisterInstituteDto) {
    return this.instituteService.register(body);
  }

  @Get('all/details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findAllWithDetails(@Request() req: { user: JwtActor }) {
    return this.instituteService.findAllWithDetails(req.user);
  }

  @Get('dashboard/:id')
  @UseGuards(JwtAuthGuard)
  getDashboard(@Param('id', ParseIntPipe) id: number, @Request() req: { user: JwtActor }) {
    return this.dashboardService.getDashboard(id, req.user);
  }

  /** Free students — no institute_id (platform / B2C). */
  @Get('students/free')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async listFreeStudents() {
    const students = await this.studentService.findFree();
    return { institute_id: null, total: students.length, students };
  }

  /** Owner / Sub Admin — auto institute from login (recommended). */
  @Get('me/students')
  @UseGuards(JwtAuthGuard)
  async listMyStudents(@Request() req: { user: JwtActor }) {
    const instituteId = await this.access.resolveActorInstituteId(req.user);
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanAccessInstituteRoster(institute, req.user);
    const students = await this.studentService.findByInstituteId(instituteId);
    return { institute_id: instituteId, total: students.length, students };
  }

  @Get('me/teachers')
  @UseGuards(JwtAuthGuard)
  async listMyTeachers(@Request() req: { user: JwtActor }) {
    const instituteId = await this.access.resolveActorInstituteId(req.user);
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanAccessInstituteRoster(institute, req.user);
    const teachers = await this.teacherService.findByInstituteId(instituteId);
    return { institute_id: instituteId, total: teachers.length, teachers };
  }

  @Get('me/parents')
  @UseGuards(JwtAuthGuard)
  async listMyParents(@Request() req: { user: JwtActor }) {
    const instituteId = await this.access.resolveActorInstituteId(req.user);
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanAccessInstituteRoster(institute, req.user);
    const parents = await this.parentService.findByInstituteId(instituteId);
    return { institute_id: instituteId, total: parents.length, parents };
  }

  @Get(':instituteId/students')
  @UseGuards(JwtAuthGuard)
  async listStudents(
    @Param('instituteId', ParseIntPipe) instituteId: number,
    @Request() req: { user: JwtActor },
  ) {
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanAccessInstituteRoster(institute, req.user);
    const students = await this.studentService.findByInstituteId(instituteId);
    return { institute_id: instituteId, total: students.length, students };
  }

  @Get(':instituteId/teachers')
  @UseGuards(JwtAuthGuard)
  async listTeachers(
    @Param('instituteId', ParseIntPipe) instituteId: number,
    @Request() req: { user: JwtActor },
  ) {
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanAccessInstituteRoster(institute, req.user);
    const teachers = await this.teacherService.findByInstituteId(instituteId);
    return { institute_id: instituteId, total: teachers.length, teachers };
  }

  @Get(':instituteId/teachers/:teacherId/assigned-classes')
  @UseGuards(JwtAuthGuard)
  getTeacherAssignedClasses(
    @Param('instituteId', ParseIntPipe) instituteId: number,
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.getTeacherAssignedClasses(
      instituteId,
      teacherId,
      req.user,
    );
  }

  @Get(':instituteId/classes')
  @UseGuards(JwtAuthGuard)
  listClasses(
    @Param('instituteId', ParseIntPipe) instituteId: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.listClasses(instituteId, req.user);
  }

  @Get(':instituteId/classes/:grade/:className/assignments')
  @UseGuards(JwtAuthGuard)
  getClassAssignments(
    @Param('instituteId', ParseIntPipe) instituteId: number,
    @Param('grade') grade: string,
    @Param('className') className: string,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.getClassAssignments(
      instituteId,
      grade,
      className,
      req.user,
    );
  }

  @Post(':instituteId/classes/:grade/:className/subject-teachers')
  @UseGuards(JwtAuthGuard)
  assignSubjectTeachersByClass(
    @Param('instituteId', ParseIntPipe) instituteId: number,
    @Param('grade') grade: string,
    @Param('className') className: string,
    @Body()
    body: {
      assignments?: Array<{
        subject?: string;
        teacherId?: number;
        teacher_id?: number;
      }>;
    },
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.assignSubjectTeachersByClass(
      instituteId,
      grade,
      className,
      body,
      req.user,
    );
  }

  @Post(':instituteId/classes/:grade/:className/students')
  @UseGuards(JwtAuthGuard)
  assignStudentsByClass(
    @Param('instituteId', ParseIntPipe) instituteId: number,
    @Param('grade') grade: string,
    @Param('className') className: string,
    @Body() body: { studentIds?: number[]; student_ids?: number[] },
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.assignStudentsByClass(
      instituteId,
      grade,
      className,
      body,
      req.user,
    );
  }

  @Get(':instituteId/parents')
  @UseGuards(JwtAuthGuard)
  async listParents(
    @Param('instituteId', ParseIntPipe) instituteId: number,
    @Request() req: { user: JwtActor },
  ) {
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanAccessInstituteRoster(institute, req.user);
    const parents = await this.parentService.findByInstituteId(instituteId);
    return { institute_id: instituteId, total: parents.length, parents };
  }

  @Get('register/:id')
  @UseGuards(JwtAuthGuard)
  findRegistration(@Param('id', ParseIntPipe) id: number, @Request() req: { user: JwtActor }) {
    return this.instituteService.findRegistrationById(id, req.user);
  }

  @Delete('register/:id')
  @UseGuards(JwtAuthGuard)
  deleteRegistration(@Param('id', ParseIntPipe) id: number, @Request() req: { user: JwtActor }) {
    return this.instituteService.deleteRegistration(id, req.user);
  }

  @Get('permissions/catalog')
  @UseGuards(JwtAuthGuard)
  getPermissionsCatalog() {
    return this.permissionsService.getCatalog();
  }

  @Get('permissions/roles/:role')
  @UseGuards(JwtAuthGuard)
  getRolePermissionDefaults(@Param('role') role: string) {
    return this.permissionsService.getRoleDefaults(role);
  }

  @Get('users/:userId/permissions')
  @UseGuards(JwtAuthGuard)
  async getUserPermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req: { user: JwtActor },
  ) {
    await this.dashboardService.getUserPermissionsForActor(userId, req.user);
    return this.permissionsService.getUserPermissions(userId);
  }

  @Patch('users/:userId/permissions')
  @UseGuards(JwtAuthGuard)
  setUserPermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: SetUserPermissionsDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.setUserPermissions(userId, body, req.user);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard)
  createUser(@Body() body: CreateInstituteUserDto, @Request() req: { user: JwtActor }) {
    return this.dashboardService.createUser(body, req.user);
  }

  @Patch('users/:userId')
  @UseGuards(JwtAuthGuard)
  updateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: UpdateInstituteUserDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.updateUser(userId, body, req.user);
  }

  @Patch('users/:userId/status')
  @UseGuards(JwtAuthGuard)
  updateUserStatus(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: UpdateUserStatusDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.updateUserStatus(userId, body, req.user);
  }

  @Patch('users/:userId/role')
  @UseGuards(JwtAuthGuard)
  updateUserRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: UpdateUserRoleDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.updateUserRole(userId, body, req.user);
  }

  @Delete('users/:userId')
  @UseGuards(JwtAuthGuard)
  deleteUser(@Param('userId', ParseIntPipe) userId: number, @Request() req: { user: JwtActor }) {
    return this.dashboardService.deleteUser(userId, req.user);
  }

  @Post('classes/:classId/assign-teacher')
  @UseGuards(JwtAuthGuard)
  assignTeacher(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() body: AssignTeacherDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.assignTeacher(classId, body, req.user);
  }

  @Post('classes/:classId/assign-students')
  @UseGuards(JwtAuthGuard)
  assignStudents(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() body: AssignStudentsDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.assignStudents(classId, body, req.user);
  }

  @Post('parents/:parentId/students')
  @UseGuards(JwtAuthGuard)
  async linkParentStudents(
    @Param('parentId', ParseIntPipe) parentId: number,
    @Body() body: { student_ids?: number[]; child_ids?: number[] },
    @Request() req: { user: JwtActor },
  ) {
    const instituteId = await this.access.resolveActorInstituteId(req.user);
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanManage(institute, req.user);
    const children = await this.parentService.linkStudentsByParentId(
      parentId,
      body.student_ids ?? body.child_ids ?? [],
      instituteId,
    );
    return { parent_id: parentId, children };
  }

  @Post('content/:contentId/assign')
  @UseGuards(JwtAuthGuard)
  assignContent(
    @Param('contentId', ParseIntPipe) contentId: number,
    @Body() body: AssignContentDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.assignContent(contentId, body, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req: { user: JwtActor }) {
    return this.instituteService.findAllForActor(req.user);
  }
}
