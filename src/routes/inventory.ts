import { Router } from 'express'
import { verifyToken } from '../middlewares/authToken'
import {
  addInventory,
  addStock,
  deleteInventory,
  editInventory,
  findInventory,
  getInventoryList
} from '../controllers/inventory'

const inventoryRouter: Router = Router()

inventoryRouter.post('/', verifyToken, addInventory)
inventoryRouter.get('/', verifyToken, getInventoryList)
inventoryRouter.get('/:id', verifyToken, findInventory)
inventoryRouter.put('/:id', verifyToken, editInventory)
inventoryRouter.put('/stock/:id', verifyToken, addStock)
inventoryRouter.delete('/:id', verifyToken, deleteInventory)

export default inventoryRouter
