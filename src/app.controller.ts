import { Controller, Param, Post } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/:lang/:ver/translate')
  async getHello(
    @Param('lang') lang: 'ja' | 'vi',
    @Param('ver') ver: 'v2' | 'v3',
  ): Promise<unknown> {
    const content = 'Hello world!'
    return await this.appService.translateText(content, lang, ver)
  }
}
