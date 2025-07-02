import { Request, Response, NextFunction } from 'express'
import { Inventory } from '@prisma/client'

import { BaseResponse } from '../types/global'
import {
  createinventory,
  createStock,
  inventoryList,
  inventoryModify,
  inventorySearach,
  Removeinventory
} from '../services/inventory'

const addInventory = async (
  req: Request,
  res: Response<BaseResponse<Inventory>>,
  next: NextFunction
) => {
  try {
    const body = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await createinventory(body)
    })
  } catch (error) {
    next(error)
  }
}

const addStock = async (
  req: Request,
  res: Response<BaseResponse<Inventory>>,
  next: NextFunction
) => {
  try {
    const body = req.body
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await createStock(body, id)
    })
  } catch (error) {
    next(error)
  }
}

const getInventoryList = async (
  _req: Request,
  res: Response<BaseResponse<Inventory[]>>,
  next: NextFunction
) => {
  try {
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await inventoryList()
    })
  } catch (error) {
    next(error)
  }
}

const findInventory = async (
  req: Request,
  res: Response<BaseResponse<Inventory | null>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await inventorySearach(id)
    })
  } catch (error) {
    next(error)
  }
}

const editInventory = async (
  req: Request,
  res: Response<BaseResponse<Inventory | null>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const body = req.body
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await inventoryModify(id, body)
    })
  } catch (error) {
    next(error)
  }
}

const deleteInventory = async (
  req: Request,
  res: Response<BaseResponse<Inventory>>,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    res.status(200).json({
      message: 'Success',
      success: true,
      data: await Removeinventory(id)
    })
  } catch (error) {
    next(error)
  }
}

export {
  addInventory,
  addStock,
  getInventoryList,
  findInventory,
  editInventory,
  deleteInventory
}
