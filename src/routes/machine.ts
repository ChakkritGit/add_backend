import { Router } from 'express'
import {
  addMachine,
  deleteMachine,
  editMachine,
  findMachine,
  getMachine
} from '@/controllers/machine'
import { verifyToken } from '@/middlewares/authToken'

const machineRouter: Router = Router()

machineRouter.post('/', verifyToken, addMachine)
machineRouter.get('/', verifyToken, getMachine)
machineRouter.get('/:id', verifyToken, findMachine)
machineRouter.put('/:id', verifyToken, editMachine)
machineRouter.delete('/:id', verifyToken, deleteMachine)

export default machineRouter
