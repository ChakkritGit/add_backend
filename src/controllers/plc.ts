import { sendCommand, sendCommandM } from '../services/plc'
import { NextFunction, Request, Response } from 'express'

const plcSendCommandController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await sendCommand(body)
    })
  } catch (error) {
    next(error)
  }
}

const plcSendCommandMController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await sendCommandM(body)
    })
  } catch (error) {
    next(error)
  }
}


export { plcSendCommandController, plcSendCommandMController }
