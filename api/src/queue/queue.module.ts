import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

        // Parse Redis URL
        let host = 'localhost';
        let port = 6379;

        if (redisUrl.startsWith('redis://')) {
          const url = new URL(redisUrl);
          host = url.hostname;
          port = parseInt(url.port || '6379');
        } else {
          // Fallback parsing
          const parts = redisUrl.replace('redis://', '').split(':');
          host = parts[0] || 'localhost';
          port = parseInt(parts[1] || '6379');
        }

        return {
          connection: {
            host,
            port,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
