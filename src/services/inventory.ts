import { HttpError } from '@/configs/errorPipe'
import prisma from '@/configs/prisma'
import { getDateFormat } from '@/utils/dateFormat'
import { Inventory } from '@prisma/client'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { v4 as uuidv4 } from 'uuid'

const createinventory = async (body: Inventory): Promise<Inventory> => {
  try {
    const UUID = `INV-${uuidv4()}`
    const checkPosition = await prisma.inventory.findMany()
    if (checkPosition.length >= 80)
      throw new HttpError(
        400,
        `Stock is limited to 60 items, but more than [${
          checkPosition.length + 1
        }] were received`
      )
    if (
      checkPosition.filter(
        item => item.InventoryPosition === body.InventoryPosition
      ).length > 0
    )
      throw new HttpError(
        400,
        `This position [${body.InventoryPosition}] already exists in the inventory`
      )
    const result = await prisma.inventory.create({
      data: {
        id: UUID,
        InventoryPosition: body.InventoryPosition,
        InventoryQty: body.InventoryQty,
        Min: body.Min,
        Max: body.Max,
        DrugId: body.DrugId,
        // MachineId: body.MachineId,
        InventoryStatus: true,
        InventoryFloor: body.InventoryFloor
      }
    })
    return result
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new HttpError(
          400,
          'This drug is already registered in the inventory, Please choose another drug!'
        )
      } else if (error.code === 'P2003') {
        throw new HttpError(
          400,
          'No drugs are registered, Please register a drug before proceeding!'
        )
      }
    }
    throw error
  }
}

const createStock = async (body: Inventory, id: string): Promise<Inventory> => {
  try {
    const findLimit = await prisma.inventory.findFirst({
      where: { id }
    })
    if (!findLimit) throw new HttpError(404, 'Inventory not found!')
    if (body.InventoryQty > findLimit.Max)
      throw new HttpError(
        400,
        `Qty [${body.InventoryQty}] exceeds Max [${findLimit.Max}] Limit`
      )
    const result = await prisma.inventory.update({
      where: { id },
      data: body
    })
    return result
  } catch (error) {
    throw error
  }
}

const inventoryList = async (): Promise<Inventory[]> => {
  try {
    const result = await prisma.inventory.findMany({
      include: { Drug: true },
      orderBy: {
        InventoryPosition: 'asc'
      }
    })
    return result
  } catch (error) {
    throw error
  }
}

const inventorySearach = async (id: string): Promise<Inventory | null> => {
  try {
    const result = await prisma.inventory.findUnique({
      where: { id: id }
    })
    if (!result) throw new HttpError(404, 'Inventory not found')
    return result
  } catch (error) {
    throw error
  }
}

const inventoryModify = async (
  id: string,
  body: Inventory
): Promise<Inventory | null> => {
  try {
    body.UpdatedAt = getDateFormat(new Date())
    const result = await prisma.inventory.update({
      data: {
        InventoryQty: body.InventoryQty,
        Min: body.Min,
        Max: body.Max,
        DrugId: body.DrugId,
        // MachineId: body.MachineId,
        InventoryStatus: true,
        InventoryFloor: body.InventoryFloor
      },
      where: { id: id }
    })
    return result
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new HttpError(404, 'Inventory not found to update')
      }
    }
    throw error
  }
}

const Removeinventory = async (id: string): Promise<Inventory> => {
  try {
    const result = await prisma.inventory.delete({
      where: { id: id }
    })
    return result
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new HttpError(404, 'Inventory not found to delete')
      }
    }
    console.log(error)
    throw error
  }
}

export {
  createinventory,
  createStock,
  inventoryList,
  inventorySearach,
  inventoryModify,
  Removeinventory
}
