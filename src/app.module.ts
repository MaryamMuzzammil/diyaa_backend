import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './Permissions/permissions.module';
import { RolePermissionModule } from './Permissions/rolePermission.module';
import { AuthModule } from './modules/auth/auth.module';
import { InstituteModule } from './modules/institute/institute.module';
import { AdminModule } from './modules/admin/admin.module';
import { StudentModule } from './modules/student/student.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 120,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        const syncExplicit = config.get<string>('TYPEORM_SYNC');
        const synchronize = isProd
          ? syncExplicit === 'true'
          : syncExplicit !== 'false' && syncExplicit !== '0';

        const portRaw = config.get<string>('DB_PORT', '5432');
        const port = Number(portRaw);
        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: Number.isFinite(port) ? port : 5432,
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize,
          logging: isProd ? (['error', 'warn'] as const) : false,
        };
      },
    }),
    UsersModule,
    RolesModule,
    PermissionsModule,
    RolePermissionModule,
    AuthModule,
    InstituteModule,
    AdminModule,
    StudentModule,
    TeacherModule,
    ChatbotModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
