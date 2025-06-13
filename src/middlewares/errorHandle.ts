import { Response } from 'express'

import { HttpError } from '@/configs/errorPipe'
import { BaseResponse } from '@/types/global'

export const globalErrorHanlder = (
  error: unknown,
  res: Response<BaseResponse>
) => {
  let statusCode = 500
  let message = ''

  if (error instanceof HttpError) {
    statusCode = error.statusCode
  }

  if (error instanceof Error) {
    console.error(`${error.name}: ${error.message}`)
    message = error.message
  } else {
    console.error('An unknown error occurred')
    message = `An unknown error occurred, ${String(error)}`
  }
  res.status(statusCode).send({
    message,
    success: false,
    data: null,
    traceStack:
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.stack
        : undefined
  })
}
