import { BadRequestException } from '@nestjs/common';
import { Institute } from '../institute/institute.entity';
import { roleAllowsNullInstitute, UserRole } from './users.entity';

export function assertInstituteIdForRole(
  role: UserRole,
  instituteId: number | null | undefined,
) {
  if (roleAllowsNullInstitute(role)) {
    return;
  }
  if (instituteId == null) {
    throw new BadRequestException(
      `institute_id is required for role ${role}. Only SuperAdmin and free Student accounts may omit it.`,
    );
  }
}

/** POST /institute/users — every role including school Student must belong to that institute. */
export function assertInstituteScopedCreate(
  role: UserRole,
  instituteId: number,
) {
  if (role === UserRole.SUPERADMIN) {
    throw new BadRequestException('SuperAdmin cannot be created via institute');
  }
  if (!instituteId) {
    throw new BadRequestException('institute_id is required');
  }
}

export function instituteIdFromUser(
  user: { institute_id?: number | null; institute?: Institute | null },
): number | null {
  return user.institute_id ?? user.institute?.id ?? null;
}
