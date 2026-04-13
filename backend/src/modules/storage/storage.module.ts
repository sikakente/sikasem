import { Global, Module } from '@nestjs/common';
import { StorageService } from '../../common/services/storage.service';
import { PdfService } from '../../common/services/pdf.service';

@Global()
@Module({
  providers: [StorageService, PdfService],
  exports: [StorageService, PdfService],
})
export class StorageModule {}
