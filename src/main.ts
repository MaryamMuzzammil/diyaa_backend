import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { seedRBAC } from './seed/role.seed';
console.log('TEST ENV:', process.env.DB_USERNAME);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);

  app.useGlobalPipes(new ValidationPipe()); // ✅ pehle lagao
  await seedRBAC(dataSource);
  await app.listen(process.env.PORT ?? 3000); // ✅ sirf ek baar
}

bootstrap();