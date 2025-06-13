import { Request, Response, NextFunction } from 'express'
import { Machines } from '@prisma/client'
import { BaseResponse } from '@/types/global'
import {
  createMachine,
  findSlotDevice,
  machineList,
  removeMachine,
  searchMachine,
  updateMachine,
  updateOrderDeviceSlot
} from '@/services/machine'

const addMachine = async (
  req: Request,
  res: Response<BaseResponse<Machines>>,
  next: NextFunction
) => {
  try {
    const body = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await createMachine(body)
    })
  } catch (error) {
    next(error)
  }
}

const getMachine = async (
  _req: Request,
  res: Response<BaseResponse<Machines[]>>,
  next: NextFunction
) => {
  try {
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await machineList()
    })
  } catch (error) {
    next(error)
  }
}

const findMachine = async (
  req: Request,
  res: Response<BaseResponse<Machines | null>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await searchMachine(id)
    })
  } catch (error) {
    next(error)
  }
}

const editMachine = async (
  req: Request,
  res: Response<BaseResponse<Machines | null>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const body = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateMachine(id, body)
    })
  } catch (error) {
    next(error)
  }
}

const deleteMachine = async (
  req: Request,
  res: Response<BaseResponse<Machines | null>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await removeMachine(id)
    })
  } catch (error) {
    next(error)
  }
}

const findSlot = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await findSlotDevice()
    })
  } catch (error) {
    next(error)
  }
}

const useSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { machine_id } = req.params
    const { machine_slot, order_id, value } = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateOrderDeviceSlot(
        machine_id,
        machine_slot,
        order_id,
        value
      )
    })
  } catch (error) {
    next(error)
  }
}

export {
  addMachine,
  getMachine,
  findMachine,
  editMachine,
  deleteMachine,
  findSlot,
  useSlot
}
