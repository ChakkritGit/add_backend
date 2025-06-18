import { plcSendCommandController, plcSendCommandMController } from '@/controllers/plc'
import { Router } from 'express'

const plcRouter: Router = Router()

plcRouter.post('/send', plcSendCommandController)
plcRouter.post('/sendM', plcSendCommandMController)


export default plcRouter
