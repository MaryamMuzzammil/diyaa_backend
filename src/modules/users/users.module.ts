import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users.entity';
import { Institute } from '../institute/institute.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CognitoModule } from '../auth/cognito.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Institute]), CognitoModule],
  providers: [UsersService],
  controllers: [UsersController], // 🔥 MUST
  exports: [UsersService],
})
export class UsersModule {}