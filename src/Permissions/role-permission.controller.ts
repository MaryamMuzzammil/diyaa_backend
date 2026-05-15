import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../modules/users/users.entity';
import { RolePermissionService } from './role-permission.service';

@Controller('role-permissions')
export class RolePermissionController {
  constructor(private service: RolePermissionService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  create(@Body() body: Record<string, unknown>) {
    return this.service.create(body);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
