import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() body) {
    return this.usersService.create(body);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }


@Get('me')
@UseGuards(AuthGuard('jwt'))
getProfile(@Request() req) {
  return {
    message: 'Login successful ✅',
    user: req.user,
  };
}
}