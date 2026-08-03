import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IotSimulatorModule } from './iot-simulator/iot-simulator.module';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';
import { DatabaseSyncModule } from './database-sync/database-sync.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AiAnalyzerModule } from './ai-analyzer/ai-analyzer.module';

@Module({
  imports: [ScheduleModule.forRoot(), IotSimulatorModule, RedisModule, PrismaModule, DatabaseSyncModule, WebsocketModule, AiAnalyzerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
