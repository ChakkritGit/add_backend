import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import http, { createServer } from 'http'
import { morganDate } from './configs/morgan'
import { globalErrorHanlder } from './middlewares/errorHandle'
import { socketService } from './utils/socket'
import { tcpService } from './utils/tcp'
import { getServerAddress } from './utils/getServerAddress'
import RabbitMQService from './utils/rabbit'
import routes from './routes'

dotenv.config()

const app = express()
const server: http.Server = createServer(app)
const rabbitService = RabbitMQService.getInstance()
const ipAddress = getServerAddress()
const serverPort = Number(process.env.SERVER_PORT) || 3000
const tcpPort = Number(process.env.TCP_PORT) || 2004

morgan.token('date', morganDate)

app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(morgan(':date, :method :url :status'))

app.use('/api', routes)
app.use(globalErrorHanlder)

server.listen(serverPort, async () => {
  console.log(`Server is running on http://${ipAddress}:${serverPort}`)

  try {
    await tcpService.initialize(ipAddress, tcpPort)
    console.log('✅ TCP server initialized')
  } catch (error) {
    console.error('Error initializing TCP Server:', error)
  }

  try {
    await socketService.initialize(server)
    console.log('✅ Socket.IO initialized')
  } catch (error) {
    console.error('Error initializing Socket.IO:', error)
  }

  try {
    await rabbitService.init()
    // await rabbitService.listenToQueue('orders')
  } catch (error) {
    console.error('RabbitMQ Error: ', error)
  }
})