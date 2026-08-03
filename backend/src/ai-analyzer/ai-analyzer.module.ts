import { Module } from '@nestjs/common';
import { AiAnalyzerService } from './ai-analyzer.service';

@Module({
  providers: [AiAnalyzerService]
})
export class AiAnalyzerModule {}
