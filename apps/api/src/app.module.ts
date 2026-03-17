import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { qrController } from './qr.controller.js';
import { qrService } from './qr.service.js';

@Module({
  providers: [
    {
      provide: 'QR_SERVICE',
      useValue: qrService,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any) => qrController.scanQRCode(req, res))
      .forRoutes({ path: 'qr/scan', method: RequestMethod.POST });
    
    consumer
      .apply((req: any, res: any) => qrController.createQRCode(req, res))
      .forRoutes({ path: 'qr/generate', method: RequestMethod.POST });

    consumer
      .apply((req: any, res: any) => qrController.resetOldQRCodes(req, res))
      .forRoutes({ path: 'qr/reset', method: RequestMethod.POST });
  }
}
