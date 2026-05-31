import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstituteAdmin } from './institute-admin.entity';
import { InstituteAdminService } from './institute-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([InstituteAdmin])],
  providers: [InstituteAdminService],
  exports: [InstituteAdminService, TypeOrmModule],
})
export class InstituteAdminModule {}
