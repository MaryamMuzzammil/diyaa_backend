import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly legacyGuard: CanActivate;
  private readonly dualGuard: CanActivate;

  constructor(private readonly config: ConfigService) {
    this.legacyGuard = new (AuthGuard('jwt'))();
    this.dualGuard = new (AuthGuard(['jwt', 'cognito-jwt']))();
  }

  canActivate(context: ExecutionContext) {
    const cognitoEnabled =
      this.config.get<string>('COGNITO_ENABLED', 'false') === 'true';
    const guard = cognitoEnabled ? this.dualGuard : this.legacyGuard;
    return guard.canActivate(context) as ReturnType<CanActivate['canActivate']>;
  }
}
