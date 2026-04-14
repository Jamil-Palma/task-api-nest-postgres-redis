import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('API de Gestión de Tareas')
    .setDescription(
      'Sistema centralizado para la gestión de tareas con persistencia en PostgreSQL, ' +
      'capa de caché con Redis y auditoría de cambios.' +
      '\n\n' +
      '**Instrucciones de Autenticación:** \n' +
      '1. Obtenga su token en el endpoint `POST /auth/login`. \n' +
      '2. Haga clic en el botón **Authorize** arriba a la derecha. \n' +
      '3. Ingrese el token con el formato: `Bearer <su_token>`.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese el token JWT',
        in: 'header',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`Application is running on: http://localhost:${port}/api/v1`, 'Bootstrap');
  logger.log(`Documentation available at: http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();