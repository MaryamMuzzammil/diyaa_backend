import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Institute } from '../institute/institute.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/users.entity';
import { InstitutePermissionsService } from '../institute/institute-permissions.service';
import { LoginDto } from './dto/login.dto';
import { CognitoAuthService } from './cognito-auth.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private permissionsService: InstitutePermissionsService,
    private cognitoAuth: CognitoAuthService,
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,
  ) {}

  async login(data: LoginDto) {
    const email = String(data.email ?? '').trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    let accessToken: string | undefined;

    if (this.cognitoAuth.isEnabled()) {
      try {
        const cognitoTokens = await this.cognitoAuth.authenticate(
          email,
          data.password,
        );
        accessToken = cognitoTokens.idToken;
      } catch {
        const isMatch = await bcrypt.compare(
          data.password,
          user.password_hash,
        );
        if (!isMatch) {
          throw new UnauthorizedException('Invalid password');
        }
      }
    } else {
      const isMatch = await bcrypt.compare(
        data.password,
        user.password_hash,
      );
      if (!isMatch) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    if (user.status === 'suspended') {
      throw new ForbiddenException('Your account has been suspended');
    }

    if (user.institute_id && user.role !== UserRole.SUPERADMIN) {
      const institute = await this.instituteRepo.findOne({
        where: { id: user.institute_id },
      });
      if (institute?.status === 'suspended') {
        throw new ForbiddenException(
          'Your institute has been suspended. Contact Diyaa support.',
        );
      }
    }

    await this.usersService.touchLastActive(user.user_id);

    const payload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
    };

    const permPayload =
      await this.permissionsService.getUserPermissions(user.user_id);

    return {
      access_token: accessToken ?? this.jwtService.sign(payload),
      user: this.usersService.toPublicUser(user),
      permissions: permPayload.permissions,
      permissions_by_module: permPayload.permissions_by_module,
    };
  }
}