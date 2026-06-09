import { NestFactory } from '@nestjs/core';
import { configure as serverlessExpress } from '@codegenie/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { configureNestApp, seedBootstrapData } from './app.setup';

let cachedServer: Handler;

async function bootstrapServer(): Promise<Handler> {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);
    await configureNestApp(app);

    try {
      await seedBootstrapData(app);
      console.log('Seeding completed successfully on cold start.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('Seeding failed or already exists:', message);
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
  if (event.source === 'serverless-plugin-warmup' || event.source === 'aws.events') {
    console.log('Warmup ping received');
    return 'ping-ok';
  }

  const server = await bootstrapServer();
  return server(event, context, callback);
};
