import { Global, Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventPublisherService } from './event-publisher.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  providers: [EventsGateway, EventPublisherService],
  exports: [EventPublisherService],
})
export class EventsModule {}
