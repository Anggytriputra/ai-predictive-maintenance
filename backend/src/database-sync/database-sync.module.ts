import { Module } from '@nestjs/common';
import { DatabaseSyncService } from './database-sync.service';

@Module({
  providers: [DatabaseSyncService]
})
export class DatabaseSyncModule {}
