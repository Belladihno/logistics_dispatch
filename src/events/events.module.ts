import { Global, Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventPublisherService } from './event-publisher.service';

@Global()
@Module({
  providers: [EventsGateway, EventPublisherService],
  // Export only the publisher; keep the gateway implementation internal.
  exports: [EventPublisherService],
})
export class EventsModule {}
