import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  // ✅ POST /roles
  @Post()
  create(@Body() body) {
    return this.rolesService.create(body);
  }

  // ✅ GET /roles
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  // ✅ DELETE /roles/:id
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(Number(id));
  }
}