import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { instituteIdFromUser } from '../users/users-institute.util';
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

  async getActorUser(actor: Actor) {
    const user = await this.userRepo.findOne({
      where: { user_id: actor.sub },
      relations: ['institute'],
    });
    if (!user) {
      throw new ForbiddenException('User account not found');
    }
    return user;
  }

  /** Institute id for logged-in Owner / Sub Admin (no URL guess). */
  async resolveActorInstituteId(actor: Actor): Promise<number> {
    const user = await this.getActorUser(actor);

    if (user.role === UserRole.SUPERADMIN) {
      throw new BadRequestException(
        'SuperAdmin: use /institute/:instituteId/students with a school id',
      );
    }

    const linkedId = instituteIdFromUser(user);
    if (linkedId) {
      return linkedId;
    }

    if (user.role === UserRole.OWNER) {
      const byEmail = await this.instituteRepo.findOne({
        where: { owner_email: user.email.toLowerCase() },
      });
      if (byEmail) return byEmail.id;
    }

    throw new ForbiddenException(
      'Your account is not linked to any institute. Register a school or ask the owner to add you.',
    );
  }

  async assertCanView(institute: Institute, actor: Actor) {
    if (!(await this.canView(institute, actor))) {
      throw new ForbiddenException('You do not have access to this institute');
    }
  }

  async assertCanManage(institute: Institute, actor: Actor) {
    if (!(await this.canManage(institute, actor))) {
      throw new ForbiddenException(
        'You do not have permission to manage this institute',
      );
    }
  }

  async assertCanAccessInstituteRoster(institute: Institute, actor: Actor) {
    if (!(await this.canAccessInstituteRoster(institute, actor))) {
      const user = await this.getActorUser(actor);
      throw new ForbiddenException(
        `Access denied. Your role is "${user.role}" for institute #${user.institute?.id ?? 'none'}. This school is #${institute.id} (${institute.name}). Use GET /institute/me/students with your own token.`,
      );
    }
  }

  async canView(institute: Institute, actor: Actor): Promise<boolean> {
    if (await this.canAccessInstituteRoster(institute, actor)) {
      return true;
    }
    const user = await this.getActorUser(actor);
    return Boolean(
      institute.users?.some((u) => u.user_id === user.user_id),
    );
  }

  async canManage(institute: Institute, actor: Actor): Promise<boolean> {
    return this.canAccessInstituteRoster(institute, actor);
  }

  /**
   * Authorization from database user — not JWT role string alone.
   * Product Owner | Institute Owner | Sub Admin of THIS institute only.
   */
  async canAccessInstituteRoster(
    institute: Institute,
    actor: Actor,
  ): Promise<boolean> {
    const user = await this.getActorUser(actor);

    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      return false;
    }

    const linkedId = instituteIdFromUser(user);
    if (linkedId === institute.id) {
      return true;
    }

    if (
      user.role === UserRole.OWNER &&
      institute.owner_email.toLowerCase() === user.email.toLowerCase()
    ) {
      return true;
    }

    return Boolean(
      institute.users?.some(
        (u) =>
          u.user_id === user.user_id &&
          (u.role === UserRole.OWNER || u.role === UserRole.ADMIN),
      ),
    );
  }
}

export type Actor = { sub: number; email: string; role: UserRole };
