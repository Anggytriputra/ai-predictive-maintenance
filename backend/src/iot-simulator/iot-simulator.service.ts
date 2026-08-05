import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class IotSimulatorService {
  private readonly logger = new Logger(IotSimulatorService.name);
  private readonly motors = ['Motor-HV-01', 'Motor-HV-02', 'Motor-MV-01'];

  constructor(private readonly redisService: RedisService) { }

  @Interval(2000)
  handleCron() {
    const client = this.redisService.getClient();


    this.motors.forEach((motorId) => {
      const data = {
        motorId,
        timestamp: new Date().toISOString(),
        temperature: this.randomFloat(70, 95),
        vibration: this.randomFloat(1.0, 4.0),
        currentR: this.randomFloat(40, 60),
        currentS: this.randomFloat(40, 60),
        currentT: this.randomFloat(40, 60),
        currentN: this.randomFloat(0, 5),
        voltageR: motorId.includes('HV') ? this.randomFloat(11000, 11500) : this.randomFloat(3300, 3500),
        voltageS: motorId.includes('HV') ? this.randomFloat(11000, 11500) : this.randomFloat(3300, 3500),
        voltageT: motorId.includes('HV') ? this.randomFloat(11000, 11500) : this.randomFloat(3300, 3500),
      };

      client.set(`machine_status:${motorId}`, JSON.stringify(data));
      // Push to a list for batch inserting into Postgres later
      client.lpush('sensor_data_buffer', JSON.stringify(data));

      // Publish to a Redis Pub/Sub channel for WebSockets to pick up
      client.publish('sensor_data', JSON.stringify(data));
    });

    this.logger.debug(`Generated and cached sensor data for ${this.motors.length} motors`);
  }

  private randomFloat(min: number, max: number): number {
    return Number((Math.random() * (max - min) + min).toFixed(2));
  }
}
