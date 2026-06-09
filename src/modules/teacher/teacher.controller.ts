import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../users/users.entity';
import { AwardRewardDto } from './dto/award-reward.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { SubmissionFeedbackDto } from './dto/submission-feedback.dto';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { TeacherDashboardApiService } from './teacher-dashboard-api.service';
import { TeacherDashboardService } from './teacher-dashboard.service';
import { TeacherGroupsService } from './teacher-groups.service';
import { TeacherResponseInterceptor } from './interceptors/teacher-response.interceptor';
import { TeacherRewardsService } from './teacher-rewards.service';
import { TeacherScopeService } from './teacher-scope.service';

type JwtActor = { sub: number; email: string; role: UserRole };

@Controller('teacher')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TeacherResponseInterceptor)
export class TeacherController {
  constructor(
    private dashboardService: TeacherDashboardService,
    private dashboardApiService: TeacherDashboardApiService,
    private scopeService: TeacherScopeService,
    private assignmentsService: TeacherAssignmentsService,
    private groupsService: TeacherGroupsService,
    private rewardsService: TeacherRewardsService,
  ) {}

  @Get('dashboard')
  getDashboard(@Request() req: { user: JwtActor }) {
    return this.dashboardService.getDashboard(req.user);
  }

  @Get('classes')
  listClasses(@Request() req: { user: JwtActor }) {
    return this.dashboardService.listClasses(req.user);
  }

  @Get('assigned-classes')
  async getAssignedClasses(@Request() req: { user: JwtActor }) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.getAssignedClasses(teacher);
  }

  @Get('students')
  listStudents(@Request() req: { user: JwtActor }) {
    return this.dashboardService.listStudents(req.user);
  }

  @Get('content')
  async listContent(@Request() req: { user: JwtActor }) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.listContent(teacher);
  }

  @Post('content')
  async createContent(
    @Request() req: { user: JwtActor },
    @Body() body: {
      classId: string;
      sectionId: string;
      subjectId: string;
      type: string;
      title: string;
      description?: string;
    },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.createContent(teacher, body);
  }

  @Post('content/:id/assign')
  async assignContent(
    @Request() req: { user: JwtActor },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { classId: string; sectionId: string; subjectId: string },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.assignContent(teacher, id, body);
  }

  @Post('ai/generate-content')
  async generateAiContent(
    @Request() req: { user: JwtActor },
    @Body()
    body: {
      classId: string;
      sectionId: string;
      subjectId: string;
      topic: string;
      difficulty: string;
      contentType: string;
    },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.generateContent(teacher, body);
  }

  @Post('ai/save-generated-content')
  async saveGeneratedContent(
    @Request() req: { user: JwtActor },
    @Body()
    body: {
      classId: string;
      sectionId: string;
      subjectId: string;
      topic: string;
      difficulty: string;
      contentType: string;
      title: string;
      body: string;
      questions?: unknown[];
    },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.saveGeneratedContent(teacher, body);
  }

  @Get('students/performance')
  async listStudentPerformance(
    @Request() req: { user: JwtActor },
    @Query()
    query: {
      classId?: string;
      sectionId?: string;
      subjectId?: string;
      status?: string;
    },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.listStudentPerformance(teacher, query);
  }

  @Get('students/:studentId/performance')
  async getStudentPerformance(
    @Request() req: { user: JwtActor },
    @Param('studentId') studentId: string,
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.getStudentPerformance(
      teacher,
      parsePrefixedId(studentId, 'stu'),
    );
  }

  @Get('analytics/class-summary')
  async classSummary(
    @Request() req: { user: JwtActor },
    @Query() query: { classId: string; sectionId: string; subjectId: string },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.classSummary(teacher, query);
  }

  @Get('analytics/topic-weakness')
  async topicWeakness(
    @Request() req: { user: JwtActor },
    @Query() query: { classId: string; sectionId: string; subjectId: string },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.topicWeakness(teacher, query);
  }

  @Get('analytics/activity-time')
  async activityTime(
    @Request() req: { user: JwtActor },
    @Query()
    query: {
      classId: string;
      sectionId: string;
      subjectId: string;
      range?: string;
    },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.activityTime(teacher, query);
  }

  @Get('assignments')
  async listAssignments(@Request() req: { user: JwtActor }) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.assignmentsService.listAssignments(teacher);
  }

  @Post('assignments')
  async createAssignment(
    @Request() req: { user: JwtActor },
    @Body() body: CreateAssignmentDto,
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    const row = await this.assignmentsService.createAssignment(teacher, body);
    return { message: 'Assignment created', assignment: row };
  }

  @Get('submissions/pending')
  async listPendingSubmissions(@Request() req: { user: JwtActor }) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.assignmentsService.listPendingSubmissions(teacher);
  }

  @Patch('submissions/:id/feedback')
  async updateSubmissionFeedback(
    @Request() req: { user: JwtActor },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SubmissionFeedbackDto,
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    const row = await this.assignmentsService.updateSubmissionFeedback(
      teacher,
      id,
      body,
    );
    return { message: 'Feedback saved', submission: row };
  }

  @Post('rewards')
  async awardReward(
    @Request() req: { user: JwtActor },
    @Body() body: AwardRewardDto,
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    const row = await this.rewardsService.awardReward(teacher, body);
    return { message: 'Reward awarded', reward: row };
  }

  @Get('groups')
  async listGroups(@Request() req: { user: JwtActor }) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.groupsService.listGroups(teacher);
  }

  @Post('groups')
  async createGroup(
    @Request() req: { user: JwtActor },
    @Body() body: CreateGroupDto,
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.groupsService.createGroup(teacher, body);
  }

  @Post('groups/:id/students')
  async addGroupStudents(
    @Request() req: { user: JwtActor },
    @Param('id') id: string,
    @Body() body: { student_ids?: number[]; studentIds?: number[] },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.addGroupStudents(
      teacher,
      parsePrefixedId(id, 'grp'),
      body,
    );
  }

  @Post('groups/:id/assign-content')
  async assignGroupContent(
    @Request() req: { user: JwtActor },
    @Param('id') id: string,
    @Body() body: { contentId?: number; content_id?: number },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.assignContentToGroup(
      teacher,
      parsePrefixedId(id, 'grp'),
      body,
    );
  }

  @Post('live-class')
  async createLiveClass(
    @Request() req: { user: JwtActor },
    @Body()
    body: { classId: string; sectionId: string; subjectId: string; title: string },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.createLiveClass(teacher, body);
  }

  @Get('live-class')
  async listLiveClasses(@Request() req: { user: JwtActor }) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.listLiveClasses(teacher);
  }

  @Patch('live-class/:id/end')
  async endLiveClass(
    @Request() req: { user: JwtActor },
    @Param('id') id: string,
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.endLiveClass(
      teacher,
      parsePrefixedId(id, 'live'),
    );
  }

  @Get('live-class/:id/attendance')
  async liveClassAttendance(
    @Request() req: { user: JwtActor },
    @Param('id') id: string,
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.liveClassAttendance(
      teacher,
      parsePrefixedId(id, 'live'),
    );
  }

  @Get('gamification/leaderboard')
  async leaderboard(
    @Request() req: { user: JwtActor },
    @Query() query: { classId: string; sectionId: string; subjectId: string },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.leaderboard(teacher, query);
  }

  @Get('students/:id/levels')
  async studentLevels(
    @Request() req: { user: JwtActor },
    @Param('id') id: string,
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.studentLevels(
      teacher,
      parsePrefixedId(id, 'stu'),
    );
  }

  @Post('students/:id/badge')
  async awardBadge(
    @Request() req: { user: JwtActor },
    @Param('id') id: string,
    @Body() body: { badge_id: string; reason?: string },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.awardBadge(
      teacher,
      parsePrefixedId(id, 'stu'),
      body,
    );
  }

  @Get('profile')
  async profile(@Request() req: { user: JwtActor }) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.profile(teacher);
  }

  @Patch('profile')
  async updateProfile(
    @Request() req: { user: JwtActor },
    @Body() body: { name?: string; branch?: string; phone?: string },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.updateProfile(teacher, body);
  }

  @Get('settings/notifications')
  async notificationSettings(@Request() req: { user: JwtActor }) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.notificationSettings(teacher);
  }

  @Patch('settings/notifications')
  async updateNotificationSettings(
    @Request() req: { user: JwtActor },
    @Body()
    body: {
      student_submissions?: boolean;
      low_performance_alerts?: boolean;
      weekly_reports?: boolean;
      ai_suggestions?: boolean;
    },
  ) {
    const teacher = await this.scopeService.getTeacherForActor(req.user);
    return this.dashboardApiService.updateNotificationSettings(teacher, body);
  }
}

function parsePrefixedId(value: string, prefix: string) {
  const match = new RegExp(`^${prefix}_(\\d+)$`, 'i').exec(value);
  return match ? Number(match[1]) : Number(value);
}
