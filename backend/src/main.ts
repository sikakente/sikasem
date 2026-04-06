import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { validateEnv } from './config/secrets.config';

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
  });

  const config = new DocumentBuilder()
    .setTitle('Export Business Manager API')
    .setDescription('Grocery Export Business Manager REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = process.env.PORT ?? process.env.APP_PORT ?? 3000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}

bootstrap();
