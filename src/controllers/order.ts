import { HttpError } from '../configs/errorPipe'
import prisma from '../configs/prisma'
import { clearAllOrder,createPresService,deletePrescription,findPrescription,getOrderService,getPharmacyPres,sendOrder,statusPrescription,updateOrderSlot,updateStatusOrderServicePending} from '../services/order'
import { BaseResponse } from '../types/global'
import { PlcSendMessage } from '../types/rabbit'
import RabbitMQService from '../utils/rabbit'
import { socketService } from '../utils/socket'
import { tcpService } from '../utils/tcp'
import { Orders } from '@prisma/client'
import { NextFunction, Request, Response } from 'express'

const dispenseOrder = async (
  req: Request,
  res: Response<BaseResponse<Orders[]>>,
  next: NextFunction
) => {
  try {
    const { machineId } = req.body
    const rfid = req.params.rfid
    const rabbitService = RabbitMQService.getInstance()

    if (!machineId || !rfid) {
      throw new HttpError(
        500,
        `Machine ID: ${machineId}, Or RFID: ${rfid}, not found!`
      )
    }

    const order = await findPrescription(rfid)
    const connectedSockets = tcpService.getConnectedSockets()

    if (order) {
      throw new HttpError(409, 'Order already exists')
    }

    const findMachine = await prisma.machines.findUnique({
      where: { id: machineId }
    })

    if (findMachine && connectedSockets.length > 0) {
      const isMatched = connectedSockets.some(
        item => item.remoteAddress === findMachine.IP
      )
      if (!isMatched) {
        throw new HttpError(500, 'เครื่องไม่พร้อมใช้งาน')
      }
    }

    const response = await getPharmacyPres(rfid)
    const value = await createPresService(response)

    await rabbitService.listenToQueue('orders')
    const cmd: PlcSendMessage[] = value
      .map(item => {
        return {
          machineId: machineId,
          presId: item.PrescriptionId,
          orderId: item.OrderItemId,
          floor: item.Floor,
          position: item.Position,
          qty: item.OrderQty
        }
      })
      .sort((a, b) => a.floor - b.floor)

    await sendOrder(cmd, 'orders')
    await statusPrescription(response.PrescriptionNo, 'pending')

    socketService
      .getIO()
      .emit('res_message', `Create : ${response.PrescriptionNo}`)

    res.status(200).json({
      message: 'Success',
      success: true,
      data: value
    })
  } catch (error) {
    next(error)
  }
}

const getOrder = async (
  _req: Request,
  res: Response<BaseResponse<Orders[]>>,
  next: NextFunction
) => {
  try {
    // const token = req.headers['authorization']
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await getOrderService()
    })
  } catch (error) {
    next(error)
  }
}

const updateStatusPending = async (
  req: Request,
  res: Response<BaseResponse<Orders>>,
  next: NextFunction
) => {
  try {
    const { id, presId } = req.params
    const { machineId } = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateStatusOrderServicePending(
        id,
        'pending',
        presId,
        machineId
      )
    })
  } catch (error) {
    next(error)
  }
}

const updateStatusReceive = async (
  req: Request,
  res: Response<BaseResponse<Orders>>,
  next: NextFunction
) => {
  try {
    const { id, presId } = req.params
    const { machineId } = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateStatusOrderServicePending(
        id,
        'receive',
        presId,
        machineId
      )
    })
  } catch (error) {
    next(error)
  }
}

const updateStatusComplete = async (
  req: Request,
  res: Response<BaseResponse<Orders>>,
  next: NextFunction
) => {
  try {
    const { id, presId } = req.params
    const { machineId } = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateStatusOrderServicePending(
        id,
        'complete',
        presId,
        machineId
      )
    })
  } catch (error) {
    next(error)
  }
}

const updateStatusRrror = async (
  req: Request,
  res: Response<BaseResponse<Orders>>,
  next: NextFunction
) => {
  try {
    const { id, presId } = req.params
    const { machineId } = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateStatusOrderServicePending(
        id,
        'error',
        presId,
        machineId
      )
    })
  } catch (error) {
    next(error)
  }
}

const updateStatusReady = async (
  req: Request,
  res: Response<BaseResponse<Orders>>,
  next: NextFunction
) => {
  try {
    const { id, presId } = req.params
    const { machineId } = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateStatusOrderServicePending(
        id,
        'ready',
        presId,
        machineId
      )
    })
  } catch (error) {
    next(error)
  }
}

const updateSlot = async (
  req: Request,
  res: Response<BaseResponse<Orders>>,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params
    const { slot } = req.body as { slot: string }
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await updateOrderSlot(
        orderId,
        slot
      )
    })
  } catch (error) {
    next(error)
  }
}

const cancelOrder = async (
  req: Request,
  res: Response<BaseResponse<string>>
) => {
  try {
    const instance = RabbitMQService.getInstance()
    const { prescriptionId } = req.params
    await deletePrescription(prescriptionId)
    await instance.cancelQueue('orders')
    socketService.getIO().emit('res_message', `Delete Order Success!!`)
    res.status(200).json({
      message: 'Success',
      success: true,
      data: 'Delete Order Success'
    })
  } catch (error) {
    throw error
  }
}

const clearOrder = async (_req: Request, res: Response) => {
  try {
    const response = await clearAllOrder()
    res.status(200).json({
      message: 'Success',
      success: true,
      data: response
    })
  } catch (error) {
    res.status(400).json({ status: 400, error: error })
  }
}

export {
  dispenseOrder,
  getOrder,
  updateStatusPending,
  updateStatusReceive,
  updateStatusComplete,
  updateStatusRrror,
  updateStatusReady,
  cancelOrder,
  clearOrder,
  updateSlot
}