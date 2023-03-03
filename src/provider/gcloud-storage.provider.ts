import { Injectable } from '@nestjs/common'
import { Storage } from '@google-cloud/storage'

interface IUploadFileParam {
  filePath: string
  destFileName: string
}

interface IDownloadFileParam {
  fileName: string
  destFileName: string
}

interface IDeleteFileParam {
  fileName: string
}

@Injectable()
export class GcpStorageService {
  public isHaveAuthKey: boolean
  public gcpBucket = process.env.GOOGLE_CLOUD_BUCKET_NAME || ''
  private storage: Storage
  private CONFIG = {
    googleCloudv3: {
      credentials: {
        client_email: process.env.GOOGLE_AUTH_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_AUTH_PRIVATE_KEY,
      },
      projectId: process.env.GOOGLE_AUTH_PROJECT_ID,
    },
  }

  constructor() {
    this.isHaveAuthKey =
      !!process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
      !!process.env.GOOGLE_AUTH_PRIVATE_KEY &&
      !!process.env.GOOGLE_AUTH_PROJECT_ID &&
      !!process.env.GOOGLE_CLOUD_BUCKET_NAME

    this.storage = new Storage(this.CONFIG.googleCloudv3)
  }

  public async getBucketList(): Promise<string[]> {
    const [buckets] = await this.storage.getBuckets()
    return buckets.map((data: any) => data.name)
  }

  public async deleteFile({ fileName }: IDeleteFileParam) {
    const options = {
      preconditionOpts: { ifGenerationMatch: 0 },
    }
    const [file] = await this.storage
      .bucket(this.gcpBucket)
      .file(fileName)
      .delete(options)

    return file
  }

  public async uploadFile({ filePath, destFileName }: IUploadFileParam) {
    const options = {
      destination: destFileName,
      preconditionOpts: { ifGenerationMatch: 0 },
    }
    const [file] = await this.storage
      .bucket(this.gcpBucket)
      .upload(filePath, options)

    return {
      name: file.name,
      url: file.cloudStorageURI.href,
      id: file.id,
    }
  }

  public async downloadFile({ fileName, destFileName }: IDownloadFileParam) {
    const options = {
      destination: destFileName,
    }
    const [file] = await this.storage
      .bucket(this.gcpBucket)
      .file(fileName)
      .download(options)
    return file
  }

  public async listFiles(): Promise<string[]> {
    const [files] = await this.storage.bucket(this.gcpBucket).getFiles()
    return files.map((file: any) => file.name)
  }

  public async checkFileExist({ fileName }): Promise<boolean> {
    const files = await this.listFiles()
    return files.includes(fileName)
  }

  public async deleteFolder({ folderName }) {
    const options = {
      preconditionOpts: { ifGenerationMatch: 0 },
    }
    const [files] = await this.storage.bucket(this.gcpBucket).getFiles()
    for (let i = 0; i < files.length; i++) {
      files[i].name.includes(folderName) && (await files[i].delete(options))
    }
  }
}