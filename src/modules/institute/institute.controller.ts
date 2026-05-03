import { Controller, Post, Body, Get } from '@nestjs/common';
import { InstituteService } from './institute.service';

@Controller('institute')
export class InstituteController {
  constructor(private instituteService: InstituteService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.instituteService.register(body);
  }

  @Get()
  findAll() {
    return this.instituteService.findAll();
  }
}