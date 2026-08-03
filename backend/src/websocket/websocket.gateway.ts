import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { OnModuleInit, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(private readonly redisService: RedisService) {}

  onModuleInit() {
    const subscriber = this.redisService.getSubscriber();
    
    subscriber.subscribe('sensor_data', (err, count) => {
      if (err) {
        this.logger.error('Failed to subscribe to sensor_data channel', err);
      } else {
        this.logger.log(`Subscribed to ${count} Redis channels.`);
      }
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'sensor_data') {
        const data = JSON.parse(message);
        // Broadcast to specific room for the motor
        this.server.to(data.motorId).emit('sensor_update', data);
        
        // Also broadcast a general overview to everyone (for the main dashboard list)
        this.server.emit('sensor_overview', data);
      }
    });
  }

  @SubscribeMessage('join_motor_room')
  handleJoinRoom(@MessageBody() motorId: string, @ConnectedSocket() client: Socket) {
    client.join(motorId);
    this.logger.debug(`Client ${client.id} joined room ${motorId}`);
    return { event: 'joined', data: motorId };
  }

  @SubscribeMessage('leave_motor_room')
  handleLeaveRoom(@MessageBody() motorId: string, @ConnectedSocket() client: Socket) {
    client.leave(motorId);
    this.logger.debug(`Client ${client.id} left room ${motorId}`);
    return { event: 'left', data: motorId };
  }
}
