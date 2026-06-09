import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureNestApp, seedBootstrapData } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await configureNestApp(app);
  await seedBootstrapData(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
