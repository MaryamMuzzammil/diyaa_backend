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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private permissionsService: InstitutePermissionsService,
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,
  ) {}

  async login(data: LoginDto) {
    const email = String(data.email ?? '').trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    const isMatch = await bcrypt.compare(
      data.password,
      user.password_hash,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Invalid password');
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
      access_token: this.jwtService.sign(payload),
      user: this.usersService.toPublicUser(user),
      permissions: permPayload.permissions,
      permissions_by_module: permPayload.permissions_by_module,
    };
  }
}