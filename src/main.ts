import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { seedInstituteRBAC } from './seed/institute-rbac.seed';
import { seedSuperAdmin } from './seed/superadmin.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);

  // Postman / copy-paste sometimes adds trailing newline (%0A) → 404
  app.use((req, _res, next) => {
    const raw = req.url ?? '';
    const q = raw.indexOf('?');
    let path = (q === -1 ? raw : raw.slice(0, q)).trim();
    path = path.replace(/(%0A|%0D)+$/gi, '');
    req.url = q === -1 ? path : `${path}${raw.slice(q)}`;
    next();
  });

  app.use(helmet());

  const origins = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins?.length ? origins : ['http://localhost:5173'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await seedInstituteRBAC(dataSource);
  await seedSuperAdmin(dataSource);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
