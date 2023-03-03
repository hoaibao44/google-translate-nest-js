import { Injectable } from '@nestjs/common'
import { v2 } from '@google-cloud/translate'
import { _removeFiles, _writeFile } from 'src/utils/file'
import { GcpTranslatev3Service } from './translatev3-gApi.provider'
import { GOOGLE_MAX_CONTENT_LENGTH } from '../utils/constants'

@Injectable()
export class GcpTranslateService {
  constructor(private gtranslatev3Service: GcpTranslatev3Service) {}

  private CONFIG = {
    googleCloud: {
      projectId: 'portfolio-g-storage',
      key: process.env.GOOGLE_TRANSLATE_API_AUTH_KEY,
    },
  }

  public async startTranslating(
    pathToFile: string,
    content: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<unknown> {
    // initialize data
    let outResult: unknown

    // prevent google API strips \n in content => replace \n with <br>
    content = content.replace(/(\r)*\n/g, '<br>')
    _writeFile(pathToFile, content)
    try {
      // we will try catch in translateText function, no need catch here
      if (content.length < GOOGLE_MAX_CONTENT_LENGTH.v2) {
        outResult = await this.translateText(
          pathToFile,
          content,
          targetLanguage,
          sourceLanguage,
        )
      } else {
        outResult = await this.gtranslatev3Service.startTranslating(
          pathToFile,
          content,
          targetLanguage,
          sourceLanguage,
        )
      }
    } finally {
      _removeFiles([pathToFile])
    }

    return outResult
  }

  /**
   * NOTE: input text max lenght is 100KB
   * japanese character count as 2B -> max leght for this is upto 50k Characters
   * default type: 'html' -> mean that html tag will not be translated
   * @param pathToFile
   * @param text
   * @param targetLanguage
   * @param sourceLanguage
   * @returns
   */
  private async translateText(
    pathToFile: string,
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<unknown> {
    // send translate request to google
    try {
      // console.log('translateText ----- ', this.CONFIG)
      const translateClient = new v2.Translate(this.CONFIG.googleCloud)
      const [translation] = await translateClient.translate(text, {
        format: 'html', // 'html' | 'text'
        from: sourceLanguage,
        to: targetLanguage,
      })

      return {
        dataTranslate: translation,
        isTransError: false,
      }
    } catch (error) {
      console.log(error)
    }
  }
}