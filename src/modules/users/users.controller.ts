import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from './users.entity';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req: { user: { sub: number } }) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      user: this.usersService.toPublicUser(user),
    };
  }
}
