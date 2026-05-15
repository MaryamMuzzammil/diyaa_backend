import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InstituteService } from '../institute/institute.service';
import { UserRole } from '../users/users.entity';
import { AdminService } from './admin.service';

type JwtActor = { sub: number; email: string; role: UserRole };

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private instituteService: InstituteService,
  ) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('subscriptions-revenue')
  getSubscriptionsRevenue() {
    return this.adminService.getSubscriptionsRevenue();
  }

  @Get('schools')
  listSchools() {
    return this.adminService.listSchools();
  }

  /** All institutes with institute + academic + subscription + users */
  @Get('institutes')
  listInstitutesWithDetails(@Request() req: { user: JwtActor }) {
    return this.instituteService.findAllWithDetails(req.user);
  }
}
