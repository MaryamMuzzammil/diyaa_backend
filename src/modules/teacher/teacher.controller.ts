import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../users/users.entity';
import { AwardRewardDto } from './dto/award-reward.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { SubmissionFeedbackDto } from './dto/submission-feedback.dto';
import { TeacherAssignmentsService } from './teacher-assignments.service';
import { TeacherDashboardService } from './teacher-dashboard.service';
import { TeacherGroupsService } from './teacher-groups.service';
import { TeacherRewardsService } from './teacher-rewards.service';
import { TeacherScopeService } from './teacher-scope.service';

type JwtActor = { sub: number; email: string; role: UserRole };

@Controller('teacher')
@UseGuards(AuthGuard('jwt'))
export class TeacherController {
  constructor(
    private dashboardService: TeacherDashboardService,
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

  @Get('students')
  listStudents(@Request() req: { user: JwtActor }) {
    return this.dashboardService.listStudents(req.user);
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
    const row = await this.groupsService.createGroup(teacher, body);
    return { message: 'Group created', group: row };
  }
}
