import { NextFunction, Request, Response } from 'express'
import { Users } from '@prisma/client'
import { BaseResponse } from '@/types/global'
import { findUsers, modifyUser, removeUser, usersList } from '@/services/user'

const getUser = async (
  _req: Request,
  res: Response<BaseResponse<Users[]>>,
  next: NextFunction
) => {
  try {
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await usersList()
    })
  } catch (error) {
    next(error)
  }
}

const getUserById = async (
  req: Request,
  res: Response<BaseResponse<Users>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await findUsers(id)
    })
  } catch (error) {
    next(error)
  }
}

const editeUser = async (
  req: Request,
  res: Response<BaseResponse<Users>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const body = req.body
    const pic = req.file
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await modifyUser(id, body, pic)
    })
  } catch (error) {
    next(error)
  }
}

const deleteUser = async (
  req: Request,
  res: Response<BaseResponse<Users>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await removeUser(id)
    })
  } catch (error) {
    next(error)
  }
}

export { getUser, getUserById, editeUser, deleteUser }
