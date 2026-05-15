import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';

import { Institute } from './institute.entity';

import { InstituteService } from './institute.service';

import { InstituteController } from './institute.controller';

import { User } from '../users/users.entity';

import { AcademicConfig } from './academic.entity';

import { Subscription } from './subscription.entity';

import { UsersModule } from '../users/users.module';

import { BillingInvoice } from './entities/billing-invoice.entity';

import { ClassSection } from './entities/class-section.entity';

import { DailyActivity } from './entities/daily-activity.entity';

import { EngagementInsight } from './entities/engagement-insight.entity';

import { InstituteContent } from './entities/institute-content.entity';

import { SubjectMetric } from './entities/subject-metric.entity';

import { InstituteAccessService } from './institute-access.service';

import { InstituteDashboardService } from './institute-dashboard.service';



@Module({

  imports: [

    TypeOrmModule.forFeature([

      Institute,

      User,

      AcademicConfig,

      Subscription,

      ClassSection,

      InstituteContent,

      BillingInvoice,

      DailyActivity,

      SubjectMetric,

      EngagementInsight,

    ]),

    UsersModule,

    AuthModule,

  ],

  providers: [

    InstituteDashboardService,

    InstituteAccessService,

    InstituteService,

  ],

  controllers: [InstituteController],

  exports: [InstituteService],

})

export class InstituteModule {}


