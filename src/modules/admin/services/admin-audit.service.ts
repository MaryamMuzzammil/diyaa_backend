import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

type AuditInput = {
  actorUserId?: number | null;
  actorEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AuditLog)
    private repo: Repository<AuditLog>,
  ) {}

  async log(input: AuditInput) {
    return this.repo.save(
      this.repo.create({
        actor_user_id: input.actorUserId ?? null,
        actor_email: input.actorEmail ?? null,
        action: input.action,
        resource_type: input.resourceType,
        resource_id:
          input.resourceId != null ? String(input.resourceId) : null,
        metadata: input.metadata ?? null,
      }),
    );
  }

  async list(page = 1, limit = 50) {
    const [rows, total] = await this.repo.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      logs: rows,
      pagination: { page, limit, total },
    };
  }
}
