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
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { REGISTRATION_OPTIONS } from './institute.constants';
import { AssignContentDto } from './dto/assign-content.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { CreateInstituteUserDto } from './dto/create-institute-user.dto';
import { RegisterInstituteDto } from './dto/register-institute.dto';
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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findAllWithDetails(@Request() req: { user: JwtActor }) {
    return this.instituteService.findAllWithDetails(req.user);
  }

  @Get('dashboard/:id')
  @UseGuards(AuthGuard('jwt'))
  getDashboard(@Param('id', ParseIntPipe) id: number, @Request() req: { user: JwtActor }) {
    return this.dashboardService.getDashboard(id, req.user);
  }

  /** Free students — no institute_id (platform / B2C). */
  @Get('students/free')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async listFreeStudents() {
    const students = await this.studentService.findFree();
    return { institute_id: null, total: students.length, students };
  }

  /** Owner / Sub Admin — auto institute from login (recommended). */
  @Get('me/students')
  @UseGuards(AuthGuard('jwt'))
  async listMyStudents(@Request() req: { user: JwtActor }) {
    const instituteId = await this.access.resolveActorInstituteId(req.user);
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanAccessInstituteRoster(institute, req.user);
    const students = await this.studentService.findByInstituteId(instituteId);
    return { institute_id: instituteId, total: students.length, students };
  }

  @Get('me/teachers')
  @UseGuards(AuthGuard('jwt'))
  async listMyTeachers(@Request() req: { user: JwtActor }) {
    const instituteId = await this.access.resolveActorInstituteId(req.user);
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanAccessInstituteRoster(institute, req.user);
    const teachers = await this.teacherService.findByInstituteId(instituteId);
    return { institute_id: instituteId, total: teachers.length, teachers };
  }

  @Get('me/parents')
  @UseGuards(AuthGuard('jwt'))
  async listMyParents(@Request() req: { user: JwtActor }) {
    const instituteId = await this.access.resolveActorInstituteId(req.user);
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanAccessInstituteRoster(institute, req.user);
    const parents = await this.parentService.findByInstituteId(instituteId);
    return { institute_id: instituteId, total: parents.length, parents };
  }

  @Get(':instituteId/students')
  @UseGuards(AuthGuard('jwt'))
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
  @UseGuards(AuthGuard('jwt'))
  async listTeachers(
    @Param('instituteId', ParseIntPipe) instituteId: number,
    @Request() req: { user: JwtActor },
  ) {
    const institute = await this.access.getInstituteOrFail(instituteId);
    await this.access.assertCanAccessInstituteRoster(institute, req.user);
    const teachers = await this.teacherService.findByInstituteId(instituteId);
    return { institute_id: instituteId, total: teachers.length, teachers };
  }

  @Get(':instituteId/parents')
  @UseGuards(AuthGuard('jwt'))
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
  @UseGuards(AuthGuard('jwt'))
  findRegistration(@Param('id', ParseIntPipe) id: number, @Request() req: { user: JwtActor }) {
    return this.instituteService.findRegistrationById(id, req.user);
  }

  @Delete('register/:id')
  @UseGuards(AuthGuard('jwt'))
  deleteRegistration(@Param('id', ParseIntPipe) id: number, @Request() req: { user: JwtActor }) {
    return this.instituteService.deleteRegistration(id, req.user);
  }

  @Get('permissions/catalog')
  @UseGuards(AuthGuard('jwt'))
  getPermissionsCatalog() {
    return this.permissionsService.getCatalog();
  }

  @Get('permissions/roles/:role')
  @UseGuards(AuthGuard('jwt'))
  getRolePermissionDefaults(@Param('role') role: string) {
    return this.permissionsService.getRoleDefaults(role);
  }

  @Get('users/:userId/permissions')
  @UseGuards(AuthGuard('jwt'))
  async getUserPermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req: { user: JwtActor },
  ) {
    await this.dashboardService.getUserPermissionsForActor(userId, req.user);
    return this.permissionsService.getUserPermissions(userId);
  }

  @Patch('users/:userId/permissions')
  @UseGuards(AuthGuard('jwt'))
  setUserPermissions(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: SetUserPermissionsDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.setUserPermissions(userId, body, req.user);
  }

  @Post('users')
  @UseGuards(AuthGuard('jwt'))
  createUser(@Body() body: CreateInstituteUserDto, @Request() req: { user: JwtActor }) {
    return this.dashboardService.createUser(body, req.user);
  }

  @Patch('users/:userId/status')
  @UseGuards(AuthGuard('jwt'))
  updateUserStatus(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: UpdateUserStatusDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.updateUserStatus(userId, body, req.user);
  }

  @Patch('users/:userId/role')
  @UseGuards(AuthGuard('jwt'))
  updateUserRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: UpdateUserRoleDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.updateUserRole(userId, body, req.user);
  }

  @Delete('users/:userId')
  @UseGuards(AuthGuard('jwt'))
  deleteUser(@Param('userId', ParseIntPipe) userId: number, @Request() req: { user: JwtActor }) {
    return this.dashboardService.deleteUser(userId, req.user);
  }

  @Post('classes/:classId/assign-teacher')
  @UseGuards(AuthGuard('jwt'))
  assignTeacher(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() body: AssignTeacherDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.assignTeacher(classId, body, req.user);
  }

  @Post('classes/:classId/assign-students')
  @UseGuards(AuthGuard('jwt'))
  assignStudents(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() body: AssignStudentsDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.assignStudents(classId, body, req.user);
  }

  @Post('content/:contentId/assign')
  @UseGuards(AuthGuard('jwt'))
  assignContent(
    @Param('contentId', ParseIntPipe) contentId: number,
    @Body() body: AssignContentDto,
    @Request() req: { user: JwtActor },
  ) {
    return this.dashboardService.assignContent(contentId, body, req.user);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@Request() req: { user: JwtActor }) {
    return this.instituteService.findAllForActor(req.user);
  }
}
