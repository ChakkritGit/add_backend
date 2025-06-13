import { NextFunction, Request, Response } from 'express'
import { Drugs } from '@prisma/client'
import { BaseResponse } from '@/types/global'
import {
  addDrug,
  deleteDrugService,
  editDrugService,
  findDrug,
  findDrugId
} from '@/services/drug'

const createDrug = async (
  req: Request,
  res: Response<BaseResponse<Drugs>>,
  next: NextFunction
) => {
  try {
    const body = req.body
    const pic = req.file
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await addDrug(body, pic)
    })
  } catch (error) {
    next(error)
  }
}

const getDrug = async (
  _req: Request,
  res: Response<BaseResponse<Drugs[]>>,
  next: NextFunction
) => {
  try {
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await findDrug()
    })
  } catch (error) {
    next(error)
  }
}

const getDrugById = async (
  req: Request,
  res: Response<BaseResponse<Drugs | null>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await findDrugId(id)
    })
  } catch (error) {
    next(error)
  }
}

const editDrug = async (
  req: Request,
  res: Response<BaseResponse<Drugs>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const body = req.body
    const pic = req.file
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await editDrugService(body, id, pic)
    })
  } catch (error) {
    next(error)
  }
}

const deleteDrug = async (
  req: Request,
  res: Response<BaseResponse<Drugs>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await deleteDrugService(id)
    })
  } catch (error) {
    next(error)
  }
}

export { createDrug, getDrug, getDrugById, editDrug, deleteDrug }
