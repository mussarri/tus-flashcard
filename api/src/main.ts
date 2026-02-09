import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Starting NestJS application...');

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Serve static files from uploads directory
    const uploadsPath =
      process.env.VISUAL_ASSETS_DIR || join(process.cwd(), 'uploads');
    app.useStaticAssets(uploadsPath, {
      prefix: '/uploads/',
    });
    logger.log(`Static assets configured: ${uploadsPath} -> /uploads/`);

    // Enable CORS for admin panel and mobile app
    const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';
    const allowedOrigins = [
      adminUrl,
      'http://localhost:8081', // Expo dev server
      /^http:\/\/192\.168\.\d+\.\d+:8081$/, // Local network IPs for Expo
    ];

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check if origin matches any allowed pattern
        const isAllowed = allowedOrigins.some((allowed) =>
          typeof allowed === 'string'
            ? allowed === origin
            : allowed.test(origin),
        );

        if (isAllowed) {
          callback(null, true);
        } else {
          logger.warn(`CORS blocked request from origin: ${origin}`);
          callback(null, false);
        }
      },
      credentials: true,
    });
    logger.log(`CORS enabled for origins: ${JSON.stringify(allowedOrigins)}`);

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());
    logger.log('Global exception filter configured');

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    logger.log('Global validation pipe configured');

    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🚀 API server running on http://localhost:${port}`);
  } catch (error) {
    logger.error(
      `Failed to start application: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : undefined,
    );
    process.exit(1);
  }
}
bootstrap();
