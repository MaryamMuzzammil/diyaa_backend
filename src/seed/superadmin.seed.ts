import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../modules/users/users.entity';

/**
 * Creates the platform SuperAdmin from env vars only — no public registration route.
 * Set SUPERADMIN_EMAIL + SUPERADMIN_PASSWORD in .env (never commit real passwords).
 */
export async function seedSuperAdmin(dataSource: DataSource) {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME?.trim() || 'Product Owner';

  if (!email || !password) {
    console.log(
      'ℹ️  SuperAdmin seed skipped — set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env',
    );
    return;
  }

  if (password.length < 12) {
    console.warn(
      '⚠️  SUPERADMIN_PASSWORD is shorter than 12 characters — use a strong secret',
    );
  }

  const userRepo = dataSource.getRepository(User);
  const existing = await userRepo.findOne({ where: { email } });
  const hash = await bcrypt.hash(password, 12);

  if (!existing) {
    await userRepo.save(
      userRepo.create({
        name,
        email,
        password_hash: hash,
        role: UserRole.SUPERADMIN,
        status: 'active',
        institute_id: null,
        institute: null,
        signup_method: 'system_seed',
      }),
    );
    console.log(`🔐 SuperAdmin provisioned (${email})`);
    return;
  }

  if (existing.role !== UserRole.SUPERADMIN) {
    console.warn(
      `⚠️  ${email} already exists with role "${existing.role}" — SuperAdmin seed not applied`,
    );
    return;
  }

  if (process.env.SUPERADMIN_SYNC_PASSWORD === 'true') {
    existing.password_hash = hash;
    existing.name = name;
    await userRepo.save(existing);
    console.log(`🔐 SuperAdmin password synced (${email})`);
    return;
  }

  console.log(`🔐 SuperAdmin already provisioned (${email})`);
}
