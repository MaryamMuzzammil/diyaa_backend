import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import { seedInstituteRBAC } from './seed/institute-rbac.seed';
import { seedSuperAdmin } from './seed/superadmin.seed';

function resolveCorsOrigins(): string[] | boolean {
  const origins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!origins?.length) {
    return ['http://localhost:5173'];
  }

  if (origins.includes('*')) {
    return true;
  }

  return origins;
}

export async function configureNestApp(app: INestApplication) {
  app.use((req, _res, next) => {
    const raw = req.url ?? '';
    const q = raw.indexOf('?');
    let path = (q === -1 ? raw : raw.slice(0, q)).trim();
    path = path.replace(/(%0A|%0D)+$/gi, '');
    req.url = q === -1 ? path : `${path}${raw.slice(q)}`;
    next();
  });

  app.use(helmet());

  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}

export async function seedBootstrapData(app: INestApplication) {
  const dataSource = app.get(DataSource);
  await seedInstituteRBAC(dataSource);
  await seedSuperAdmin(dataSource);
}
