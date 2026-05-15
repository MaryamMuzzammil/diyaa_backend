import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(data: LoginDto) {
    const email = String(data.email ?? '').trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    const isMatch = await bcrypt.compare(
      data.password,
      user.password_hash,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.usersService.touchLastActive(user.user_id);

    const payload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: this.usersService.toPublicUser(user),
    };
  }
}