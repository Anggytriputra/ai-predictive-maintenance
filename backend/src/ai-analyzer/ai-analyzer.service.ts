import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiAnalyzerService implements OnModuleInit {
  private readonly logger = new Logger(AiAnalyzerService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const subscriber = this.redisService.getSubscriber();
    
    subscriber.on('message', async (channel, message) => {
      if (channel === 'sensor_data') {
        const data = JSON.parse(message);
        await this.analyzeData(data);
      }
    });
  }

  private async analyzeData(data: any) {
    // Mock AI Logic for Predictive Maintenance
    let riskLevel = 'LOW';
    let message = '';

    if (data.temperature > 85 && data.vibration > 8) {
      riskLevel = 'CRITICAL';
      message = 'AI Predicts: High probability of Bearing Failure within 24-48 hours due to combined thermal and vibration stress.';
    } else if (data.temperature > 80 || data.vibration > 6) {
      riskLevel = 'WARNING';
      message = 'AI Predicts: Accelerated wear detected. Schedule maintenance soon.';
    }

    if (riskLevel !== 'LOW') {
      try {
        await this.prisma.alert.create({
          data: {
            machineId: data.motorId,
            message: message,
            severity: riskLevel,
          }
        });
        
        // Publish alert to Redis so WebSocket can broadcast it
        const client = this.redisService.getClient();
        await client.publish('ai_alert', JSON.stringify({
          motorId: data.motorId,
          riskLevel,
          message,
          timestamp: new Date().toISOString()
        }));

        this.logger.warn(`[AI ALERT] ${data.motorId}: ${riskLevel}`);
      } catch (err) {
        // Ignored if machine doesn't exist yet in DB
      }
    }
  }
}
