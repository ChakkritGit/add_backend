import { BaseResponse } from '@/types/global'
import express, { Request, Response, Router, NextFunction } from 'express'
import authRouter from '@/routes/auth'
import userRouter from '@/routes/user'
import drugRouter from '@/routes/drug'
import inventoryRouter from '@/routes/inventory'
import machineRouter from '@/routes/machine'
import plcRouter from '@/routes/plc'
import orderRouter from '@/routes/order'

const routes = Router()

routes.use('/auth', authRouter)
routes.use('/users', userRouter)
routes.use('/drugs', drugRouter)
routes.use('/inventory', inventoryRouter)
routes.use('/machine', machineRouter)
routes.use('/plc', plcRouter)
routes.use('/orders', orderRouter)
routes.use(
  '/img',
  express.static(
    process.env.NODE_ENV === 'development'
      ? 'src/public/images'
      : 'public/images'
  )
)
routes.use(
  '/',
  (_req: Request, res: Response<BaseResponse>, _next: NextFunction) => {
    res.status(404).json({
      message: 'Not Found',
      success: false,
      data: null
    })
  }
)

export default routes
