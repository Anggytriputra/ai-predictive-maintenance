import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DatabaseSyncService {
  private readonly logger = new Logger(DatabaseSyncService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  @Interval(10000) // Sync every 10 seconds
  async syncRedisToDatabase() {
    const client = this.redisService.getClient();
    
    // Pop up to 100 records from the buffer
    const records: any[] = [];
    for (let i = 0; i < 100; i++) {
      const recordStr = await client.rpop('sensor_data_buffer');
      if (!recordStr) break;
      records.push(JSON.parse(recordStr));
    }

    if (records.length === 0) return;

    this.logger.debug(`Syncing ${records.length} records to PostgreSQL...`);

    try {
      // Ensure machines exist
      const machineIds = [...new Set(records.map(r => r.motorId))];
      for (const machineId of machineIds) {
        await this.prisma.machine.upsert({
          where: { id: machineId as string },
          update: {},
          create: {
            id: machineId as string,
            name: machineId as string,
            type: (machineId as string).includes('HV') ? 'HV' : 'MV',
          }
        });
      }

      // Batch insert sensor logs
      await this.prisma.sensorDataLog.createMany({
        data: records.map(r => ({
          machineId: r.motorId,
          temperature: r.temperature,
          vibration: r.vibration,
          currentR: r.currentR,
          currentS: r.currentS,
          currentT: r.currentT,
          currentN: r.currentN,
          voltageR: r.voltageR,
          voltageS: r.voltageS,
          voltageT: r.voltageT,
          timestamp: new Date(r.timestamp),
        }))
      });

      this.logger.debug(`Successfully saved ${records.length} records to database.`);
    } catch (error) {
      this.logger.error('Failed to sync records to database', error);
      // Fallback: put records back in case of failure
      for (const r of records) {
        await client.rpush('sensor_data_buffer', JSON.stringify(r));
      }
    }
  }
}
