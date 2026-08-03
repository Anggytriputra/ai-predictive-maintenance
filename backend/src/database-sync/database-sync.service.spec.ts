import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseSyncService } from './database-sync.service';

describe('DatabaseSyncService', () => {
  let service: DatabaseSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseSyncService],
    }).compile();

    service = module.get<DatabaseSyncService>(DatabaseSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
