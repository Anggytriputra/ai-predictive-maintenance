import { Test, TestingModule } from '@nestjs/testing';
import { IotSimulatorService } from './iot-simulator.service';

describe('IotSimulatorService', () => {
  let service: IotSimulatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IotSimulatorService],
    }).compile();

    service = module.get<IotSimulatorService>(IotSimulatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
