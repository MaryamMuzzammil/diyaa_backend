import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../users/users.entity';
import { CompleteGameDto } from './dto/complete-game.dto';
import { StudentDashboardService } from './student-dashboard.service';
import { StudentProgressService } from './student-progress.service';

type JwtActor = { sub: number; email: string; role: UserRole };

@Controller('student')
@UseGuards(AuthGuard('jwt'))
export class StudentController {
  constructor(
    private dashboardService: StudentDashboardService,
    private progressService: StudentProgressService,
  ) {}

  @Get('dashboard')
  getDashboard(@Request() req: { user: JwtActor }) {
    return this.dashboardService.getDashboard(req.user);
  }

  /** Record game win/loss — updates skill → level → subject scores. */
  @Post('games/complete')
  async completeGame(
    @Request() req: { user: JwtActor },
    @Body() body: CompleteGameDto,
  ) {
    const student = await this.dashboardService.getStudentForActor(req.user);
    const result = await this.progressService.completeGame(student, body);
    return {
      message: body.won ? 'Game recorded' : 'Attempt logged',
      ...result,
    };
  }
}
