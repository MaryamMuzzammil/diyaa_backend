import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '../users/users.entity';
import { ParentResponseInterceptor } from './interceptors/parent-response.interceptor';
import { ParentDashboardService } from './parent-dashboard.service';

type JwtActor = { sub: number; email: string; role: UserRole };

@Controller('parent')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ParentResponseInterceptor)
export class ParentController {
  constructor(private dashboard: ParentDashboardService) {}

  @Get('profile')
  async profile(@Request() req: { user: JwtActor }) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.profile(parent);
  }

  @Get('children')
  async children(@Request() req: { user: JwtActor }) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.children(parent);
  }

  @Get('children/:childId/overview')
  async overview(
    @Request() req: { user: JwtActor },
    @Param('childId') childId: string,
  ) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.overview(parent, parseChildId(childId));
  }

  @Get('children/:childId/progress')
  async progress(
    @Request() req: { user: JwtActor },
    @Param('childId') childId: string,
  ) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.progress(parent, parseChildId(childId));
  }

  @Get('children/:childId/behavior')
  async behavior(
    @Request() req: { user: JwtActor },
    @Param('childId') childId: string,
  ) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.behavior(parent, parseChildId(childId));
  }

  @Get('children/:childId/certificates')
  async certificates(
    @Request() req: { user: JwtActor },
    @Param('childId') childId: string,
  ) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.certificates(parent, parseChildId(childId));
  }

  @Get('children/:childId/safety-controls')
  async safetyControls(
    @Request() req: { user: JwtActor },
    @Param('childId') childId: string,
  ) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.safetyControls(parent, parseChildId(childId));
  }

  @Patch('children/:childId/safety-controls/:key')
  async patchSafetyControl(
    @Request() req: { user: JwtActor },
    @Param('childId') childId: string,
    @Param('key') key: string,
    @Body() body: { enabled: boolean },
  ) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.patchSafetyControl(
      parent,
      parseChildId(childId),
      key,
      body,
    );
  }

  @Get('children/:childId/notifications')
  async notifications(
    @Request() req: { user: JwtActor },
    @Param('childId') childId: string,
  ) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.notifications(parent, parseChildId(childId));
  }

  @Get('children/:childId/engagement-tips')
  async engagementTips(
    @Request() req: { user: JwtActor },
    @Param('childId') childId: string,
  ) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.engagementTips(parent, parseChildId(childId));
  }

  @Get('settings')
  async settings(@Request() req: { user: JwtActor }) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.settings(parent);
  }

  @Patch('settings')
  async updateSettings(
    @Request() req: { user: JwtActor },
    @Body()
    body: {
      progress_notifications?: boolean;
      weekly_reports?: boolean;
      safety_alerts?: boolean;
      notification_preferences?: {
        progress_notifications?: boolean;
        weekly_reports?: boolean;
        safety_alerts?: boolean;
      };
      email?: string;
      language?: string;
    },
  ) {
    const parent = await this.dashboard.getParentForActor(req.user);
    return this.dashboard.updateSettings(parent, body);
  }
}

function parseChildId(value: string) {
  const match = /^stu_(\d+)$/i.exec(value);
  return match ? Number(match[1]) : Number(value);
}
