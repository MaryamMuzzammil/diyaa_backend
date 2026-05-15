import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstituteModule } from '../institute/institute.module';
import { Institute } from '../institute/institute.entity';
import { Subscription } from '../institute/subscription.entity';
import { User } from '../users/users.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Institute, Subscription, User]),
    InstituteModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
