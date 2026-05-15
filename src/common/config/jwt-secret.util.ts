import { ConfigService } from '@nestjs/config';

const DEV_FALLBACK =
  'dev-only-insecure-jwt-secret-min-32-chars!!';

/**
 * Resolves JWT signing secret. Production requires a strong explicit secret.
 */
export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  const isProd = config.get<string>('NODE_ENV') === 'production';

  if (!secret) {
    if (isProd) {
      throw new Error(
        'JWT_SECRET must be set in production (use a long random value).',
      );
    }
    return DEV_FALLBACK;
  }

  if (isProd && secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters in production.',
    );
  }

  return secret;
}
