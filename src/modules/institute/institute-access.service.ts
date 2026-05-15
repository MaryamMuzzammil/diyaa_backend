import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/users.entity';
import { Institute } from './institute.entity';

@Injectable()
export class InstituteAccessService {
  constructor(
    @InjectRepository(Institute)
    private instituteRepo: Repository<Institute>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getInstituteOrFail(id: number) {
    const institute = await this.instituteRepo.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!institute) {
      throw new NotFoundException(`Institute #${id} not found`);
    }
    return institute;
  }

  assertCanView(institute: Institute, actor: Actor) {
    if (!this.canView(institute, actor)) {
      throw new ForbiddenException('You do not have access to this institute');
    }
  }

  assertCanManage(institute: Institute, actor: Actor) {
    if (!this.canManage(institute, actor)) {
      throw new ForbiddenException(
        'You do not have permission to manage this institute',
      );
    }
  }

  canView(institute: Institute, actor: Actor): boolean {
    if (
      actor.role === UserRole.SUPERADMIN ||
      actor.role === UserRole.ADMIN
    ) {
      return true;
    }
    if (
      actor.role === UserRole.OWNER &&
      institute.owner_email.toLowerCase() === actor.email.toLowerCase()
    ) {
      return true;
    }
    return Boolean(
      institute.users?.some((u) => u.user_id === actor.sub),
    );
  }

  canManage(institute: Institute, actor: Actor): boolean {
    if (
      actor.role === UserRole.SUPERADMIN ||
      actor.role === UserRole.ADMIN
    ) {
      return true;
    }
    if (
      actor.role === UserRole.OWNER &&
      institute.owner_email.toLowerCase() === actor.email.toLowerCase()
    ) {
      return true;
    }
    const actorUser = institute.users?.find((u) => u.user_id === actor.sub);
    return actorUser?.role === UserRole.ADMIN;
  }
}

export type Actor = { sub: number; email: string; role: UserRole };
