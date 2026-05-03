import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { RolePermissionService } from './role-permission.service';

@Controller('role-permissions')
export class RolePermissionController {
  constructor(private service: RolePermissionService) {}

  // assign permission to role
  @Post()
  create(@Body() body) {
    return this.service.create(body);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}