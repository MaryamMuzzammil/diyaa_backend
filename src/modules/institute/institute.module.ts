import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institute } from './institute.entity';
import { InstituteService } from './institute.service';
import { InstituteController } from './institute.controller';
import { User } from '../users/users.entity';
import { AcademicConfig } from './academic.entity';
import { Subscription } from './subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Institute, User, AcademicConfig, Subscription])],
  providers: [InstituteService],
  controllers: [InstituteController],
})
export class InstituteModule {}