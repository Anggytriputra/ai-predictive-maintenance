import { Module } from '@nestjs/common';
import { IotSimulatorService } from './iot-simulator.service';

@Module({
  providers: [IotSimulatorService]
})
export class IotSimulatorModule {}
