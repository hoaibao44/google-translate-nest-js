import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { GcpStorageService } from './provider/gcloud-storage.provider'
import { GcpTranslateService } from './provider/translatev2-gAPI.provider'
import { GcpTranslatev3Service } from './provider/translatev3-gApi.provider'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
    })
  ],
  controllers: [AppController],
  providers: [AppService, GcpTranslatev3Service, GcpTranslateService, GcpStorageService],
})
export class AppModule {}
