import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

interface TypingPayload {
  threadId: string;
  isTyping: boolean;
}

// Heartbeat interval in milliseconds (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow all origins - specific checking done in handleConnection
      callback(null, true);
    },
    credentials: true,
  },
  namespace: 'chat',
  pingInterval: HEARTBEAT_INTERVAL,
  pingTimeout: 10000,
})
@Injectable()
export class ChatGateway implements OnModuleInit, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSockets = new Map<string, { userId: string; username: string }>();
  private allowedOrigins: string[] = ['*'];

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    // Load allowed origins from environment
    const corsOrigins = this.configService.get<string>('CORS_ORIGINS');
    if (corsOrigins && corsOrigins !== '*') {
      this.allowedOrigins = corsOrigins.split(',').map(o => o.trim());
      this.logger.log(`Chat CORS configured for: ${this.allowedOrigins.join(', ')}`);
    } else {
      this.logger.warn('Chat CORS allowing all origins - configure CORS_ORIGINS for production');
    }
  }

  afterInit = (server: Server) => {
    // Use optional chaining in case logger isn't initialized yet
    this.logger?.log('Chat WebSocket Gateway initialized');
    // CORS headers are handled by Socket.io configuration
  }

  async onModuleInit() {
    this.logger.log('Resetting all user presence to inactive');
    await this.usersService.resetAllPresence();
  }

  private isOriginAllowed(origin: string): boolean {
    if (this.allowedOrigins.includes('*')) return true;
    if (!origin) return true; // Same-origin requests
    return this.allowedOrigins.some(allowed => 
      origin === allowed || origin.endsWith(allowed.replace(/^\*/, ''))
    );
  }



  handleConnection = async (client: Socket) => {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Chat client ${client.id} missing token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.userId;
      const username = payload.username || 'Unknown';

      if (!userId) {
        this.logger.warn(`Chat client ${client.id} missing userId in token`);
        client.disconnect();
        return;
      }

      this.userSockets.set(client.id, { userId: userId.toString(), username });
      const roomName = `user_${userId.toString()}`;
      await client.join(roomName);
      this.logger.log(`Chat client ${client.id} joined ${roomName}`);
      
      // Update presence
      await this.usersService.updatePresence(BigInt(userId), 'active');
      this.broadcastPresence(BigInt(userId), 'active');
    } catch (error) {
      this.logger.error(`Chat connection error for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect = async (client: Socket) => {
    const userInfo = this.userSockets.get(client.id);
    if (userInfo) {
      this.userSockets.delete(client.id);
      
      // Update presence
      await this.usersService.updatePresence(BigInt(userInfo.userId), 'inactive');
      this.broadcastPresence(BigInt(userInfo.userId), 'inactive');
      
      this.logger.log(`Chat client ${client.id} disconnected (User ${userInfo.userId})`);
    } else {
      this.userSockets.delete(client.id);
      this.logger.log(`Chat client ${client.id} disconnected`);
    }
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @MessageBody() data: TypingPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const userInfo = this.userSockets.get(client.id);
    if (!userInfo) return;

    // Broadcast to all users in the thread room
    const threadRoom = `thread_${data.threadId}`;
    client.to(threadRoom).emit('chat:typing', {
      threadId: data.threadId,
      userId: userInfo.userId,
      username: userInfo.username,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('chat:joinThread')
  handleJoinThread(
    @MessageBody() data: { threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const threadRoom = `thread_${data.threadId}`;
    client.join(threadRoom);
    this.logger.log(`Client ${client.id} joined ${threadRoom}`);
  }

  @SubscribeMessage('chat:leaveThread')
  handleLeaveThread(
    @MessageBody() data: { threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const threadRoom = `thread_${data.threadId}`;
    client.leave(threadRoom);
    this.logger.log(`Client ${client.id} left ${threadRoom}`);
  }

  sendMessageToUsers(userIds: Array<string | bigint>, payload: any) {
    const rooms = userIds.map((id) => `user_${id.toString()}`);
    this.server.to(rooms).emit('chat:message', payload);
  }

  sendThreadUpdate(userIds: Array<string | bigint>, payload: any) {
    const rooms = userIds.map((id) => `user_${id.toString()}`);
    this.server.to(rooms).emit('chat:thread', payload);
  }

  broadcastTyping(userIds: Array<string | bigint>, payload: any) {
    const rooms = userIds.map((id) => `user_${id.toString()}`);
    this.server.to(rooms).emit('chat:typing', payload);
  }

  broadcastReaction(userIds: Array<string | bigint>, payload: any) {
    const rooms = userIds.map((id) => `user_${id.toString()}`);
    this.server.to(rooms).emit('chat:reaction', payload);
  }

  broadcastMessageEdit(userIds: Array<string | bigint>, payload: any) {
    const rooms = userIds.map((id) => `user_${id.toString()}`);
    this.server.to(rooms).emit('chat:messageEdit', payload);
  }

  broadcastMessageDelete(userIds: Array<string | bigint>, payload: any) {
    const rooms = userIds.map((id) => `user_${id.toString()}`);
    this.server.to(rooms).emit('chat:messageDelete', payload);
  }

  broadcastPresence(userId: bigint, status: string) {
    this.server.emit('chat:presence', { userId: userId.toString(), status });
  }

  broadcastRead(threadId: bigint, userId: bigint, readAt: Date) {
    const threadRoom = `thread_${threadId.toString()}`;
    this.server.to(threadRoom).emit('chat:read', {
      threadId: threadId.toString(),
      userId: userId.toString(),
      readAt: readAt.toISOString(),
    });
  }
}

