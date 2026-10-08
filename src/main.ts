import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';

let cachedApp: INestApplication | null = null;

async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      colors: true,
      json: true,
    }),
  });
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Notes API documentation')
    .setDescription('The notes API description')
    .setVersion('1.0')
    .addTag('notes')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.init();
  return app;
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  if (!cachedApp) {
    cachedApp = await bootstrap();
  }
  const httpAdapter = cachedApp.getHttpAdapter();
  const instance = httpAdapter.getInstance() as {
    callback: () => (req: Request, res: Response) => void;
  };
  instance.callback()(req, res);
}

if (require.main === module) {
  void bootstrap()
    .then(async (app) => {
      const port = process.env.PORT ?? 5000;
      await app.listen(port);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
