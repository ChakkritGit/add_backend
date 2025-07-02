import {
  cancelOrder,
  clearOrder,
  dispenseOrder,
  getOrder,
  updateSlot,
  updateStatusComplete,
  updateStatusPending,
  updateStatusReady,
  updateStatusReceive,
  updateStatusRrror
} from '../controllers/order'
import { Router } from 'express'

const orderRouter: Router = Router()

orderRouter.get('/', getOrder)
orderRouter.post('/dispense/:rfid', dispenseOrder)
orderRouter.post('/status/pending/:id/:presId', updateStatusPending)
orderRouter.post('/status/receive/:id/:presId', updateStatusReceive)
orderRouter.post('/status/complete/:id/:presId', updateStatusComplete) //ตัดยา
orderRouter.post('/status/error/:id/:presId', updateStatusRrror)
orderRouter.post('/status/ready/:id/:presId', updateStatusReady)
orderRouter.post('/slot/update/:orderId', updateSlot)
orderRouter.post('/:prescriptionId', cancelOrder)
orderRouter.get('/clear', clearOrder)

export default orderRouter