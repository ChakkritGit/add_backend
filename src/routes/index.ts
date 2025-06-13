import { BaseResponse } from '@/types/global'
import { Response, Router } from 'express'
import authRouter from '@/routes/auth'
import userRouter from '@/routes/user'
import drugRouter from '@/routes/drug'
import inventoryRouter from '@/routes/inventory'
import machineRouter from '@/routes/machine'

const routes = Router()

routes.use('/auth', authRouter)
routes.use('/users', userRouter)
routes.use('/drugs', drugRouter)
routes.use('/inventory', inventoryRouter)
routes.use('/machine', machineRouter)
routes.use('/', (res: Response<BaseResponse>) => {
  res.status(404).json({
    message: 'Not Found',
    success: false,
    data: null
  })
})

export default routes
