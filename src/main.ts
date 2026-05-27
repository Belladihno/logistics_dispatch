import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { ResponseTimeInterceptor } from './common/interceptors/response-time.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  // Register WebSocket adapter (Socket.IO) early so gateways initialize
  // with the correct adapter during module bootstrap.
  app.useWebSocketAdapter(new IoAdapter(app));

  if (process.env.TRUST_PROXY === 'true') {
    const httpAdapter = app.getHttpAdapter().getInstance() as {
      set?: (name: string, value: unknown) => void;
    };

    httpAdapter.set?.('trust proxy', 1);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new RequestLoggingInterceptor(),
    new ResponseTimeInterceptor(),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Logistics Dispatch API')
    .setDescription('API documentation for authentication and core services')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    process.env.NODE_ENV !== 'production';

  if (swaggerEnabled) {
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: false,
      },
      customSiteTitle: 'Logistics Dispatch API Docs',
    });
  }

  await app.listen(process.env.PORT ?? 3000);
  const appUrl = await app.getUrl();

  if (swaggerEnabled) {
    console.log(`Swagger docs available at ${appUrl}/docs`);
  }
}
void bootstrap();
