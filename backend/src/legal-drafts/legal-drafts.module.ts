import { Module } from '@nestjs/common';
import { LegalDraftsController } from './legal-drafts.controller';
import { LegalDraftsService } from './legal-drafts.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [LegalDraftsController],
  providers: [LegalDraftsService],
  exports: [LegalDraftsService],
})
export class LegalDraftsModule {}
