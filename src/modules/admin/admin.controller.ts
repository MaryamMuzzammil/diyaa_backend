import {
  Body,
  Controller,
  Delete,
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
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InstituteService } from '../institute/institute.service';
import { UserRole } from '../users/users.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { AdminResponseInterceptor } from './interceptors/admin-response.interceptor';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminInstitutesService } from './services/admin-institutes.service';
import { AdminOverviewService } from './services/admin-overview.service';
import { AdminPlatformService } from './services/admin-platform.service';
import { AdminSubscriptionsService } from './services/admin-subscriptions.service';
import { AdminUsersService } from './services/admin-users.service';

type JwtActor = { sub: number; email: string; role: UserRole };

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPERADMIN)
@UseInterceptors(AdminResponseInterceptor)
export class AdminController {
  constructor(
    private overviewService: AdminOverviewService,
    private institutesService: AdminInstitutesService,
    private usersService: AdminUsersService,
    private platformService: AdminPlatformService,
    private subscriptionsService: AdminSubscriptionsService,
    private auditService: AdminAuditService,
    private instituteService: InstituteService,
  ) {}

  // --- Overview ---
  @Get('dashboard/overview')
  getDashboardOverview() {
    return this.overviewService.getOverview();
  }

  @Get('overview')
  getOverviewLegacy() {
    return this.overviewService.getOverview();
  }

  @Get('analytics')
  getAnalytics(
    @Query('school_id') schoolId = 'all',
    @Query('range') range = '7d',
  ) {
    return this.overviewService.getAnalytics(schoolId, range);
  }

  @Get('feature-engagement')
  getFeatureEngagement(@Query('range') range = '7d') {
    return this.overviewService.getFeatureEngagement(range);
  }

  @Get('schools')
  listSchools() {
    return this.overviewService.listSchools();
  }

  // --- Institutes ---
  @Get('institutes')
  listInstitutes(@Query() query: PaginationQueryDto & { status?: string }) {
    return this.institutesService.list(
      query.search,
      query.status,
      query.page,
      query.limit,
      query.sort,
      query.order,
    );
  }

  @Get('institutes/legacy-details')
  listInstitutesLegacy(@Request() req: { user: JwtActor }) {
    return this.instituteService.findAllWithDetails(req.user);
  }

  @Patch('institutes/:id/status')
  updateInstituteStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'active' | 'suspended'; reason?: string },
    @Request() req: { user: JwtActor },
  ) {
    return this.institutesService.updateStatus(
      id,
      body.status,
      body.reason,
      req.user,
    );
  }

  @Post('institutes/:id/assign-plan')
  assignPlan(
    @Param('id', ParseIntPipe) instituteId: number,
    @Body() body: { plan_id: number },
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.assignPlanToInstitute(
      instituteId,
      body.plan_id,
      req.user,
    );
  }

  // --- Users ---
  @Get('users')
  listUsers(
    @Query() query: PaginationQueryDto & { role?: string; status?: string },
  ) {
    return this.usersService.list(
      query.role,
      query.status,
      query.search,
      query.page,
      query.limit,
    );
  }

  @Get('users/export')
  exportUsers(@Query('role') role?: string) {
    return this.usersService.exportUsers(role);
  }

  @Get('users/:id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getById(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<CreateUserDto>,
    @Request() req: { user: JwtActor },
  ) {
    return this.usersService.update(id, body, req.user);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
    @Request() req: { user: JwtActor },
  ) {
    return this.usersService.updateStatus(id, body.status, req.user);
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.usersService.remove(id, req.user);
  }

  // --- Content ---
  @Get('content')
  listContent(
    @Query() query: PaginationQueryDto & { status?: string; type?: string },
  ) {
    return this.platformService.listContent(
      query.status,
      query.type,
      query.page,
      query.limit,
    );
  }

  @Post('content')
  createContent(
    @Body() body: Record<string, unknown>,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.createContent(body as any, req.user);
  }

  @Get('content/:id')
  getContent(@Param('id', ParseIntPipe) id: number) {
    return this.platformService.getContent(id);
  }

  @Patch('content/:id')
  updateContent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.updateContent(id, body as any, req.user);
  }

  @Post('content/:id/approve')
  approveContent(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.approveContent(id, req.user);
  }

  @Post('content/:id/reject')
  rejectContent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.rejectContent(id, body.reason, req.user);
  }

  // --- Games ---
  @Get('games/analytics')
  gamesAnalytics() {
    return this.platformService.gamesAnalytics();
  }

  @Get('games')
  listGames() {
    return this.platformService.listGames();
  }

  @Get('games/:id')
  getGame(@Param('id', ParseIntPipe) id: number) {
    return this.platformService.getGame(id);
  }

  @Patch('games/:id/status')
  updateGameStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.updateGameStatus(id, body.status, req.user);
  }

  // --- Curriculum ---
  @Get('curriculum/catalog')
  getCurriculumCatalog() {
    return this.platformService.getCurriculumCatalog();
  }

  @Get('curriculum/versions')
  listCurriculumVersions() {
    return this.platformService.listCurriculumVersions();
  }

  @Post('curriculum/versions')
  createCurriculumVersion(
    @Body() body: { version: string; changes: string; release_date?: string },
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.createCurriculumVersion(body, req.user);
  }

  @Get('curriculum/versions/:id')
  getCurriculumVersion(@Param('id', ParseIntPipe) id: number) {
    return this.platformService.getCurriculumVersion(id);
  }

  @Post('curriculum/versions/:id/publish')
  publishCurriculumVersion(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.publishCurriculumVersion(id, req.user);
  }

  @Post('curriculum/versions/:id/rollback')
  rollbackCurriculumVersion(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.rollbackCurriculumVersion(id, req.user);
  }

  // --- Moderation ---
  @Get('moderation/summary')
  moderationSummary() {
    return this.platformService.moderationSummary();
  }

  @Get('moderation/queue')
  moderationQueue(
    @Query() query: PaginationQueryDto & { risk?: string; type?: string },
  ) {
    return this.platformService.moderationQueue(
      query.risk,
      query.type,
      query.page,
      query.limit,
    );
  }

  @Post('moderation/:id/approve')
  approveModeration(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.approveModeration(id, req.user);
  }

  @Post('moderation/:id/block')
  blockModeration(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.blockModeration(id, req.user);
  }

  // --- Security ---
  @Get('security/permissions')
  securityPermissions() {
    return this.platformService.listSecurityPermissions();
  }

  @Patch('security/permissions/:permission_key')
  patchSecurityPermission(
    @Param('permission_key') key: string,
    @Body() body: { enabled: boolean },
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.patchSecurityPermission(
      key,
      body.enabled,
      req.user,
    );
  }

  @Get('security/alerts')
  securityAlerts() {
    return this.platformService.listSecurityAlerts();
  }

  @Get('security/login-anomalies')
  loginAnomalies() {
    return this.platformService.listLoginAnomalies();
  }

  @Post('security/login-anomalies/:id/investigate')
  investigateAnomaly(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.investigateAnomaly(id, req.user);
  }

  @Post('security/login-anomalies/:id/block-ip')
  blockAnomalyIp(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.blockAnomalyIp(id, req.user);
  }

  // --- Community ---
  @Get('community/summary')
  communitySummary() {
    return this.platformService.communitySummary();
  }

  @Get('community/posts')
  communityPosts(
    @Query() query: PaginationQueryDto & { status?: string },
  ) {
    return this.platformService.listCommunityPosts(
      query.status,
      query.page,
      query.limit,
    );
  }

  @Post('community/posts/:id/approve')
  approveCommunityPost(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.approveCommunityPost(id, req.user);
  }

  @Patch('community/posts/:id')
  patchCommunityPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content?: string; status?: string },
  ) {
    return this.platformService.patchCommunityPost(id, body);
  }

  @Post('community/posts/:id/reject')
  rejectCommunityPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.rejectCommunityPost(id, body.reason, req.user);
  }

  // --- Subscriptions & revenue ---
  @Get('subscriptions-revenue')
  subscriptionsRevenue() {
    return this.subscriptionsService.getSubscriptionsRevenue();
  }

  @Get('subscription-plans')
  listPlans() {
    return this.platformService.listPlans();
  }

  @Post('subscription-plans')
  createPlan(
    @Body() body: Record<string, unknown>,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.createPlan(body as any, req.user);
  }

  @Patch('subscription-plans/:id')
  updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.updatePlan(id, body as any, req.user);
  }

  @Post('invoices/:id/retry')
  retryInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.retryInvoice(id, req.user);
  }

  @Post('payment-issues/:id/resolve')
  resolvePaymentIssue(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.resolvePaymentIssue(id, req.user);
  }

  // --- Platform settings ---
  @Get('platform-settings')
  platformSettings() {
    return this.platformService.getPlatformSettings();
  }

  @Patch('platform-settings/:key')
  patchPlatformSetting(
    @Param('key') key: string,
    @Body() body: { enabled?: boolean; value?: string },
    @Request() req: { user: JwtActor },
  ) {
    return this.platformService.patchPlatformSetting(key, body, req.user);
  }

  // --- Search & notifications ---
  @Get('search')
  search(@Query('q') q = '') {
    return this.platformService.search(q);
  }

  @Get('notifications')
  notifications() {
    return this.platformService.listNotifications();
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@Param('id', ParseIntPipe) id: number) {
    return this.platformService.markNotificationRead(id);
  }

  // --- Audit logs ---
  @Get('audit-logs')
  auditLogs(@Query() query: PaginationQueryDto) {
    return this.auditService.list(query.page, query.limit);
  }
}
