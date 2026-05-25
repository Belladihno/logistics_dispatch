import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';

// NOTE: Using a permissive `cors: true` is convenient for development but too
// open for production. When authentication is added, set `ALLOWED_ORIGIN` and
// mirror the HTTP CORS policy, e.g. { origin: process.env.ALLOWED_ORIGIN,
// credentials: true }.
@WebSocketGateway({
  cors: { origin: process.env.ALLOWED_ORIGIN, credentials: true },
})
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  emitToRoom(room: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.debug(
        `WebSocket server not ready. Dropping event ${event} to ${room}`,
      );
      return;
    }

    try {
      this.server.to(room).emit(event, payload);
    } catch (err) {
      this.logger.warn(
        `Failed to emit event ${event} to room ${room}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}
