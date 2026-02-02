import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Heartbeat interval in milliseconds (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  },
  namespace: 'notifications',
  pingInterval: HEARTBEAT_INTERVAL,
  pingTimeout: 10000,
})
@Injectable()
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private allowedOrigins: string[] = ['*'];

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const corsOrigins = this.configService.get<string>('CORS_ORIGINS');
    if (corsOrigins && corsOrigins !== '*') {
      this.allowedOrigins = corsOrigins.split(',').map(o => o.trim());
      this.logger.log(`Notifications CORS configured for: ${this.allowedOrigins.join(', ')}`);
    }
  }

  afterInit(server: Server) {
    this.logger.log('Notifications WebSocket Gateway initialized');
    // CORS headers are handled by Socket.io configuration
  }

  private isOriginAllowed(origin: string): boolean {
    if (this.allowedOrigins.includes('*')) return true;
    if (!origin) return true;
    return this.allowedOrigins.some(allowed => 
      origin === allowed || origin.endsWith(allowed.replace(/^\*/, ''))
    );
  }


  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;

      this.logger.debug(`Client ${client.id} connecting. Token present: ${!!token}`);

      if (!token) {
        this.logger.warn(`Client ${client.id} has no token`);
        client.disconnect();
        return;
      }

      // Verify token
      const payload = this.jwtService.verify(token);
      this.logger.debug(`Client ${client.id} token payload: ${JSON.stringify(payload)}`);
      
      const userId = payload.sub || payload.userId; // Adjust based on your JWT payload structure

      if (!userId) {
        this.logger.warn(`Client ${client.id} token invalid payload: No userId found`);
        client.disconnect();
        return;
      }

      // Join user-specific room
      const roomName = `user_${userId}`;
      await client.join(roomName);
      
      this.logger.log(`Client ${client.id} joined room ${roomName} (userId: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Sends a notification to a specific user
   * @param userId The user ID (bigint or string)
   * @param payload The notification payload
   */
  sendToUser(userId: string | bigint, payload: any) {
    const roomName = `user_${userId.toString()}`;
    this.logger.debug(`Attempting to send notification to room: ${roomName}`);
    this.server.to(roomName).emit('notification', payload);
    this.logger.debug(`Sent notification to ${roomName}`);
  }
}
