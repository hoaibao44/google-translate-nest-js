import { Injectable } from '@nestjs/common'
import { GcpTranslateService as GcpTranslateProvider } from './provider/translatev2-gAPI.provider'
import { GcpTranslatev3Service as GcpTranslatev3Provider } from './provider/translatev3-gApi.provider'
import { _createAndGetSessionPath, _isFileExist } from './utils/file'

@Injectable()
export class AppService {
  constructor( 
    private gv2: GcpTranslateProvider,
    private gv3: GcpTranslatev3Provider
  ){}

  async translateText( inData: string, targetlang: 'ja' | 'vi', gver: 'v2' | 'v3' ): Promise<unknown> {

    const pathToFile = `${_createAndGetSessionPath()}/${targetlang}_bf.html`
    // check if translating
    if (_isFileExist(pathToFile)) {
      return 'translating, try later...'
    }

    if (gver == 'v2') {
      return await this.gv2.startTranslating(pathToFile, inData, targetlang)
    }

    return await this.gv3.startTranslating(pathToFile, inData, targetlang)
  }
}
