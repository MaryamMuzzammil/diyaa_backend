import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { seedRBAC } from './seed/role.seed';
import { seedSuperAdmin } from './seed/superadmin.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);

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

  await seedRBAC(dataSource);
  await seedSuperAdmin(dataSource);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
