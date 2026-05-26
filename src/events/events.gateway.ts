import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import {
  EVENT_JOIN_ROOM,
  EVENT_JOIN_ACK,
  EVENT_JOIN_ERROR,
  ROOM_DRIVER,
  ROOM_ORDER,
  EVENT_DRIVER_LOCATION_UPDATE,
} from './events.constants';
import type { JoinRoomPayload } from './events.constants';
import { UserRole } from 'src/users/enums/user-role.enum';
import { ModuleRef } from '@nestjs/core';
import { TrackingService } from 'src/tracking/tracking.service';

@WebSocketGateway({
  cors: { origin: process.env.ALLOWED_ORIGIN ?? '*', credentials: true },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly moduleRef: ModuleRef,
  ) {}

  afterInit(): void {
    this.logger.log('EventsGateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(EVENT_JOIN_ROOM)
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ): Promise<void> {
    if (!payload || !payload.token) {
      client.emit(EVENT_JOIN_ERROR, { reason: 'missing_token' });
      return;
    }

    try {
      const decoded = this.jwtService.verify<{
        sub?: string;
        role?: UserRole;
        driverProfileId?: string | null;
      }>(payload.token);

      const role = decoded?.role ?? null;
      const userId = decoded?.sub;
      const driverProfileId = decoded?.driverProfileId;

      if (!userId || !role) {
        client.emit(EVENT_JOIN_ERROR, { reason: 'invalid_token_payload' });
        return;
      }

      if (role === UserRole.DRIVER) {
        if (!driverProfileId) {
          client.emit(EVENT_JOIN_ERROR, { reason: 'no_driver_profile' });
          return;
        }

        const room = ROOM_DRIVER(driverProfileId);
        await client.join(room);
        client.emit(EVENT_JOIN_ACK, { room });
        this.logger.log(`Client ${client.id} joined ${room}`);
        return;
      }

      const roomsJoined: string[] = [];

      const orderIds =
        payload.orderIds ?? (payload.orderId ? [payload.orderId] : []);

      if (orderIds.length === 0) {
        client.emit(EVENT_JOIN_ERROR, { reason: 'missing_order_id' });
        return;
      }

      for (const oid of orderIds) {
        const room = ROOM_ORDER(oid);
        await client.join(room);
        roomsJoined.push(room);
      }

      client.emit(EVENT_JOIN_ACK, { rooms: roomsJoined });
      this.logger.log(
        `Client ${client.id} joined rooms ${roomsJoined.join(',')}`,
      );
    } catch (err) {
      this.logger.warn(
        `Join failed for client ${client.id}`,
        err instanceof Error ? err.stack : undefined,
      );
      client.emit(EVENT_JOIN_ERROR, { reason: 'invalid_token' });
    }
  }

  @SubscribeMessage(EVENT_DRIVER_LOCATION_UPDATE)
  async handleDriverLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lat: number; lng: number; orderId?: string },
  ): Promise<void> {
    if (!payload) return;

    try {
      // Extract token from client's stored handshake auth if present (safe-guarded)
      const auth = client.handshake.auth as unknown;
      let token: string | undefined;
      if (
        auth &&
        typeof auth === 'object' &&
        auth !== null &&
        'token' in auth
      ) {
        const t = (auth as Record<string, unknown>).token;
        if (typeof t === 'string') token = t;
      }
      if (!token) {
        client.emit('error', { reason: 'missing_token' });
        return;
      }

      const decoded = this.jwtService.verify<{
        role?: UserRole;
        driverProfileId?: string;
      }>(token);
      if (decoded?.role !== UserRole.DRIVER || !decoded.driverProfileId) {
        client.emit('error', { reason: 'not_driver' });
        return;
      }

      const trackingService = this.moduleRef.get(TrackingService, {
        strict: false,
      });
      if (!trackingService) {
        this.logger.warn('TrackingService not available');
        return;
      }

      await trackingService.handleLocationUpdate(
        decoded.driverProfileId,
        payload.lat,
        payload.lng,
      );
    } catch (err) {
      this.logger.warn(
        'driver location update failed',
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

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
