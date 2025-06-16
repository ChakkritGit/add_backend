import {
  cancelOrder,
  clearOrder,
  dispenseOrder,
  getOrder,
  updateStatusComplete,
  updateStatusPending,
  updateStatusReady,
  updateStatusReceive,
  updateStatusRrror
} from '@/controllers/order'
import { Router } from 'express'

const orderRouter: Router = Router()

orderRouter.get('/', getOrder)
orderRouter.get('/dispense/:rfid', dispenseOrder)
orderRouter.get('/status/pending/:id/:presId', updateStatusPending)
orderRouter.get('/status/receive/:id/:presId', updateStatusReceive)
orderRouter.get('/status/complete/:id/:presId', updateStatusComplete)
orderRouter.get('/status/error/:id/:presId', updateStatusRrror)
orderRouter.get('/status/ready/:id/:presId', updateStatusReady)
orderRouter.post('/:prescriptionId', cancelOrder)
orderRouter.get('/clear', clearOrder)

export default orderRouter
