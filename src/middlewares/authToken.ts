import { HttpError } from '../configs/errorPipe'
import { Request, Response, NextFunction } from 'express'
import { JsonWebTokenError, verify } from 'jsonwebtoken'

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.headers.authorization) {
      const token: string = req.headers.authorization.split(' ')[1]
      const decoded = verify(String(token), String(process.env.JWT_SECRET))
      res.locals.token = decoded
      next()
    } else {
      next(new HttpError(401, 'Invalid token!!'))
    }
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      next(new HttpError(401, `${error.name} : ${error.message}`))
    } else {
      next(error)
    }
  }
}
