import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institute } from '../institute/institute.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CognitoJwtStrategy } from './cognito-jwt.strategy';
import { CognitoModule } from './cognito.module';
import { UsersModule } from '../users/users.module';
import { RbacModule } from '../rbac/rbac.module';
import { JwtStrategy } from './jwt.strategy';
import { resolveJwtSecret } from '../../common/config/jwt-secret.util';
const cognitoEnabled = process.env.COGNITO_ENABLED === 'true';

@Module({
  imports: [
    CognitoModule,
    UsersModule,
    RbacModule,
    TypeOrmModule.forFeature([Institute]),
    PassportModule.register({ defaultStrategy: 'jwt' }),    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config),
        signOptions: {
          expiresIn:
            Number(config.get<string>('JWT_EXPIRES_SEC', '86400')) || 86400,
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    ...(cognitoEnabled ? [CognitoJwtStrategy] : []),
  ],
  controllers: [AuthController],
  exports: [AuthService, CognitoModule],
})
export class AuthModule {}