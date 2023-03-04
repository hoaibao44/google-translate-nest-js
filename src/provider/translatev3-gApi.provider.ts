import { Injectable } from '@nestjs/common'
import {
  _getFileName,
  _readFile,
  _removeFiles,
  _writeFile,
} from '../utils/file'
import { v3 } from '@google-cloud/translate'
import { GOOGLE_MAX_CONTENT_LENGTH } from '../utils/constants'
import { GcpStorageService } from './gcloud-storage.provider'

const DEFAULT_LANG = 'ja'

@Injectable()
export class GcpTranslatev3Service {
  private translateClient: v3.TranslationServiceClient
  public isHaveAuthKey: boolean
  private CONFIG = {
    googleCloudv3: {
      credentials: {
        client_email: process.env.GOOGLE_AUTH_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_AUTH_PRIVATE_KEY,
      },
      projectId: process.env.GOOGLE_AUTH_PROJECT_ID,
    },
  }

  constructor(private readonly gcloudStorage: GcpStorageService) {
    console.log(this.CONFIG)
    this.isHaveAuthKey =
      !!process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
      !!process.env.GOOGLE_AUTH_PRIVATE_KEY &&
      !!process.env.GOOGLE_AUTH_PROJECT_ID

    this.translateClient = new v3.TranslationServiceClient(
      this.CONFIG.googleCloudv3,
    )
  }

  public async startTranslating(
    pathToFile: string,
    content: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<unknown> {
    // initialize data
    let outResult: unknown
    const pathToFilev3 = pathToFile.replace('.html', '_v3.html')

    // prevent google API strips \n in content => replace \n with <br>
    content = content.replace(/(\r)*\n/g, '<br>')

    // main flow
    _writeFile(pathToFilev3, content)
    try {
      // we will try catch in translateText function, no need catch here
      if (content.length < GOOGLE_MAX_CONTENT_LENGTH.v3) {
        outResult = await this.translateText(
          pathToFilev3,
          content,
          targetLanguage,
          sourceLanguage,
        )
      } else {
        // BE AWARE: that translate file will not provide auto-lang-detection
        outResult = await this.translateFile(
          pathToFilev3,
          targetLanguage,
          sourceLanguage ? sourceLanguage : await this.detectLanguage(content),
        )
      }
    } finally {
      _removeFiles([pathToFilev3])
    }

    return outResult
  }

  public async startTranslatingArray(
    pathToFile: string,
    contentList: string[],
    targetLanguage: string,
    sourceLanguage: string,
  ): Promise<unknown> {
    // initialize data
    const outResult = {
      dataTranslate: [] as string[],
      isTransError: true,
    }
    let translateResults
    const pathToFilev3 = pathToFile.replace('.html', '_v3.html')

    // main flow
    _writeFile(pathToFilev3, contentList.toString())
    // await new Promise(resolve => setTimeout(resolve, 20000)) // test translating in gui
    try {
      translateResults = await this.translateText(
        pathToFilev3,
        contentList,
        targetLanguage,
        sourceLanguage,
      )

      outResult.dataTranslate = translateResults.dataTranslate
      outResult.isTransError = translateResults.isTransError
    } finally {
      _removeFiles([pathToFilev3])
    }

    return outResult
  }

  /**
   * @param pathToFile
   * @param text
   * @param targetLanguage
   * @param sourceLanguage
   * @returns
   */
  public async translateText(
    pathToFile: string,
    text: string | string[],
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<unknown> {
    // send translate request to google
    try {
      const needTranslateText = Array.isArray(text) ? text : [text]

      const [response] = await this.translateClient.translateText({
        parent: `projects/${this.CONFIG.googleCloudv3.projectId}/locations/global`,
        contents: needTranslateText,
        mimeType: 'text/html', // 'html' | 'text'
        sourceLanguageCode: sourceLanguage,
        targetLanguageCode: targetLanguage,
      })

      if (!response.translations) {
        return {
          dataTranslate: '',
          isTransError: true,
        }
      }

      return {
        dataTranslate: Array.isArray(text)
          ? response.translations.map((data) => data.translatedText || '')
          : response.translations[0].translatedText || '',
        isTransError: false,
      }
    } catch (error) {
      console.log(error)
      return {
        dataTranslate: '',
        isTransError: true,
      }
    }
  }

  public async translateFile(
    pathToFile: string,
    targetLanguage: string,
    sourceLanguage: string,
  ): Promise<unknown> {
    const destFileName = _getFileName(pathToFile)
    const destFolderName = `gs://${this.gcloudStorage.gcpBucket}/translate_output_${destFileName}/`
    const pathToOutputFile = pathToFile.replace('_bf', '_af')

    try {
      // check if already has result file in cloud storage
      if (
        await this.gcloudStorage.checkFileExist({
          fileName: `translate_output_${destFileName}/${
            this.gcloudStorage.gcpBucket
          }_${destFileName.replace(
            '.html',
            '',
          )}_${targetLanguage}_translations.html`,
        })
      ) {
        // console.log('translateFile -- has cloud result')
        return await this.getResultContentFromGCloud({
          destFileName,
          pathToOutputFile,
        })
      }

      const file = await this.gcloudStorage.uploadFile({
        filePath: pathToFile,
        destFileName: destFileName,
      })

      // Construct request
      const request = {
        parent: `projects/${this.CONFIG.googleCloudv3.projectId}/locations/us-central1`,
        sourceLanguageCode: sourceLanguage,
        targetLanguageCodes: [targetLanguage],
        inputConfigs: [
          {
            mimeType: 'text/html', // mime types: text/plain, text/html
            gcsSource: {
              inputUri: file.url,
            },
          },
        ],
        outputConfig: {
          gcsDestination: {
            outputUriPrefix: destFolderName,
          },
        },
      }

      // Batch translate text using a long-running operation
      const [operation] = await this.translateClient.batchTranslateText(request)

      // Wait for operation to complete.
      await operation.promise() //60-70s

      return await this.getResultContentFromGCloud({
        destFileName,
        pathToOutputFile,
      })
    } catch (error) {
      console.log('Google translate file v3 error: ', error)
      return {
        dataTranslate: '',
        isTransError: true,
      }
    } finally {
      try {
        //try to clear folder and old file
        await this.gcloudStorage.deleteFolder({
          folderName: destFileName,
        })
      } catch (e) {
        console.log('Google cloud error: ', e)
      }
      _removeFiles([pathToFile, pathToOutputFile])
    }
  }

  private async detectLanguage(content: string): Promise<string> {
    try {
      // get the first 10000 character
      content = content.slice(0, 10000)

      // Construct request
      const request = {
        parent: `projects/${this.CONFIG.googleCloudv3.projectId}/locations/us-central1`,
        content: content,
      }

      // Run request
      const [response] = await this.translateClient.detectLanguage(request)
      const lang = response.languages
        ? response.languages[0].languageCode || 'ja'
        : DEFAULT_LANG
      return lang
    } catch (error) {
      console.log('Google translate file v3 error: ', error)
      return DEFAULT_LANG
    }
  }

  private async getResultContentFromGCloud({ destFileName, pathToOutputFile }) {
    const files = await this.gcloudStorage.listFiles()
    let targetOutputFile
    files.forEach((file: string) => {
      if (
        file.includes(`translate_output_${destFileName}/`) &&
        file.includes(destFileName.replace('.html', '')) &&
        !file.includes('index.csv')
      ) {
        targetOutputFile = file
      }
    })

    if (targetOutputFile) {
      await this.gcloudStorage.downloadFile({
        fileName: targetOutputFile,
        destFileName: pathToOutputFile,
      })
      const outputContent = _readFile(pathToOutputFile)
      return {
        dataTranslate: outputContent,
        isTransError: false,
      }
    }

    // console.log('target ouput file deleted')
    return {
      dataTranslate: '',
      isTransError: false,
    }
  }
}