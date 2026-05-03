import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Institute } from '../institute/institute.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Institute])],
  providers: [UsersService],
  controllers: [UsersController], // 🔥 MUST
  exports: [UsersService],
})
export class UsersModule {}