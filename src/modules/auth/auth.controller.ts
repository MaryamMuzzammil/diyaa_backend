import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Get('login')
  loginFromQuery(@Query('email') email: string, @Query('password') password: string) {
    return this.authService.login({ email, password });
  }
}