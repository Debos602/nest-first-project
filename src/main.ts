import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      colors: true,
      json: true,
    }),
  });
  app.useGlobalPipes(new ValidationPipe());

  const allowedOrigins = process.env.CLIENT_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins?.length) {
    app.enableCors({ origin: allowedOrigins, credentials: true });
  }

  const config = new DocumentBuilder()
    .setTitle('Notes API documentation')
    .setDescription('The notes API description')
    .setVersion('1.0')
    .addTag('notes')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 5000);
  console.log(`Server is running on http://localhost:${process.env.PORT ?? 5000}`);
  console.log(`Swagger is running on http://localhost:${process.env.PORT ?? 5000}/api/docs`);
  return app;
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
