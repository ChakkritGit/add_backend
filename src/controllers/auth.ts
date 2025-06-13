import { NextFunction, Request, Response } from 'express'
import { Users } from '@prisma/client'
import { GenQr } from '@/types/user'
import { BaseResponse } from '@/types/global'
import {
  createQrEncrypt,
  userLogin,
  userLoginQR,
  userRegister
} from '@/services/auth'

const createUser = async (
  req: Request,
  res: Response<BaseResponse<Users>>,
  next: NextFunction
) => {
  try {
    const body = req.body
    const pic = req.file
    // const token = req.headers['authorization']
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await userRegister(body, pic)
    })
  } catch (error) {
    next(error)
  }
}

const generateQR = async (
  req: Request,
  res: Response<BaseResponse<GenQr>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await createQrEncrypt(id)
    })
  } catch (error) {
    next(error)
  }
}

const checkLogin = async (
  req: Request,
  res: Response<BaseResponse<Users>>,
  next: NextFunction
) => {
  try {
    const body = req.body
    if (body.pinCode) {
      res.status(200).json({
        message: 'Success',
        success: true,
        data: await userLoginQR(body.pinCode)
      })
    } else {
      res.status(200).json({
        message: 'Success',
        success: true,
        data: await userLogin(body)
      })
    }
  } catch (error) {
    next(error)
  }
}

export { createUser, generateQR, checkLogin }
