import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { seedInstituteRBAC } from './seed/institute-rbac.seed';
import { seedSuperAdmin } from './seed/superadmin.seed';
import { configure as serverlessExpress } from '@codegenie/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';

let cachedServer: Handler;

async function bootstrapServer(): Promise<Handler> {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);

    // Apply the exact middleware and route fixes from main.ts
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

    // Run seeds on startup
    try {
      const dataSource = app.get(DataSource);
      await seedInstituteRBAC(dataSource);
      await seedSuperAdmin(dataSource);
      console.log('Seeding completed successfully on cold start.');
    } catch (error) {
      console.warn('Seeding failed or already exists:', error.message);
    }

    await app.init();

    const expressApp = app.getHttpAdapter().getInstance();
    cachedServer = serverlessExpress({ app: expressApp });
  }
  return cachedServer;
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  // Support warmup pings from EventBridge or plugins
  if (event.source === 'serverless-plugin-warmup' || event.source === 'aws.events') {
    console.log('Warmup ping received');
    return 'ping-ok';
  }

  const server = await bootstrapServer();
  return server(event, context, callback);
};
