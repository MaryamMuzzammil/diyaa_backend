import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

type CognitoJwtPayload = {
  sub: string;
  email?: string;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  token_use?: string;
};

@Injectable()
export class CognitoJwtStrategy extends PassportStrategy(
  Strategy,
  'cognito-jwt',
) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const region = config.get<string>('COGNITO_REGION', 'us-east-1');
    const userPoolId = config.get<string>('COGNITO_USER_POOL_ID', '');
    const clientId = config.get<string>('COGNITO_CLIENT_ID', '');
    const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      issuer,
      audience: clientId,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${issuer}/.well-known/jwks.json`,
      }),
    });
  }

  async validate(payload: CognitoJwtPayload) {
    if (payload.token_use && payload.token_use !== 'id') {
      throw new UnauthorizedException('Invalid Cognito token type');
    }

    const email = String(
      payload.email ?? payload['cognito:username'] ?? '',
    )
      .trim()
      .toLowerCase();

    if (!email) {
      throw new UnauthorizedException('Cognito token missing email');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      sub: user.user_id,
      email: user.email,
      role: user.role,
    };
  }
}
