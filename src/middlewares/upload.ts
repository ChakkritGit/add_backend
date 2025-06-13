import path from 'node:path'
import fs from 'node:fs'
import { Request } from 'express'
import { v4 as uuidv4 } from 'uuid'
import multer, {
  diskStorage,
  FileFilterCallback,
  Multer,
  StorageEngine
} from 'multer'
import { HttpError } from '@/configs/errorPipe'

type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

const storage: StorageEngine = diskStorage({
  destination: (
    req: Request,
    _file: Express.Multer.File,
    callback: DestinationCallback
  ): void => {
    let pathname: string = selectPath(req.originalUrl.split('/')[2])
    if (!fs.existsSync(pathname)) fs.mkdirSync(pathname, { recursive: true })
    callback(null, path.join(pathname))
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    callback: FileNameCallback
  ): void => {
    let extArr: string[] = file.originalname.split('.')
    let ext: string = extArr[extArr.length - 1]
    callback(
      null,
      file.mimetype === 'application/octet-stream' ||
        file.mimetype === 'application/macbinary'
        ? file.originalname
        : `img-${uuidv4()}.${ext}`
    )
  }
})

const upload: Multer = multer({
  storage: storage,
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback
  ) => {
    if (
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'application/octet-stream' ||
      file.mimetype === 'application/macbinary' ||
      file.mimetype === 'font/ttf'
    ) {
      callback(null, true)
    } else {
      return callback(new HttpError(400, 'Invalid mime type'))
    }
  }
})

const selectPath = (path: string): string => {
  let pathname: string = ''
  switch (path) {
    case 'auth':
      pathname =
        process.env.NODE_ENV === 'development'
          ? 'src/public/images/users'
          : 'public/images/users'
      break
    case 'users':
      pathname =
        process.env.NODE_ENV === 'development'
          ? 'src/public/images/users'
          : 'public/images/users'
      break
    case 'drugs':
      pathname =
        process.env.NODE_ENV === 'development'
          ? 'src/public/images/drugs'
          : 'public/images/drugs'
      break
    case 'font':
      pathname =
        process.env.NODE_ENV === 'development'
          ? 'src/public/font'
          : 'public/font'
      break
    default:
      pathname =
        process.env.NODE_ENV === 'development'
          ? 'src/public/images'
          : 'public/images'
  }
  return pathname
}

export { upload }
