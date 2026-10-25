import { Module } from '@nestjs/common';
import { ProceedingsController } from './proceedings.controller';
import { ProceedingsService } from './proceedings.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ProceedingsController],
  providers: [ProceedingsService],
  exports: [ProceedingsService],
})
export class ProceedingsModule {}
