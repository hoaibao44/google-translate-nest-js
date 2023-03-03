import {
    chmodSync,
    existsSync,
    mkdirSync,
    readFileSync,
    unlinkSync,
    writeFileSync,
  } from 'fs'
  
  import { basename } from 'path'
  
  /**
   * get path info from env then create folder
   * @returns sessionPath
   */
  export const _createAndGetSessionPath = (): string => {
    const sessionPath = process.env.TRANSLATE_SESSION_PATH || ''
    if (!existsSync(sessionPath)) {
      mkdirSync(sessionPath, { recursive: true })
      if (!(process.env.ENV == 'local')) {
        chmodSync(sessionPath, '777')
      }
    }
    return sessionPath
  }
  
  /**
   * remove file with path if exist
   * @param paths
   * @private
   */
  export const _removeFiles = (paths: string[]) => {
    paths.forEach((path) => {
      if (path && existsSync(path)) {
        unlinkSync(path)
      }
    })
  }
  
  /**
   * remove file with path if exist
   * @param paths
   * @private
   */
  export const _isFileExist = (paths: string): boolean => {
    return existsSync(paths)
  }
  /**
   * read file
   * @param path
   * @private
   */
  export const _readFile = (path: string): string => {
    return readFileSync(path, 'utf8')
  }
  
  /**
   * remove file with path if exist
   * @param paths
   * @param content
   * @private
   */
  export const _writeFile = (paths: string, content: string): void => {
    _createAndGetSessionPath()
    writeFileSync(paths, content)
  }
  
  export const _getFileName = (paths: string) => {
    return basename(paths)
  }