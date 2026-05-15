import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { resolveJwtSecret } from '../../common/config/jwt-secret.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config),
    });
  }

  async validate(payload: {
    sub: number;
    email: string;
    role: string;
  }) {
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}