import { PlcSendMessage } from '@/types/rabbit'
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib'
import dotenv from 'dotenv'
import { tcpService } from './tcp'
import axios from 'axios'
import { socketService } from './socket'
import { sendCommandFromQueue } from '@/services/plc'

dotenv.config()

class RabbitMQService {
  private static instance: RabbitMQService
  private connection!: ChannelModel
  private channel!: Channel
  private ackMessage = ''
  private newMessage: ConsumeMessage | null = null

  private constructor () {}

  public static getInstance (): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService()
    }
    return RabbitMQService.instance
  }

  async init (): Promise<void> {
    try {
      this.connection = await amqp.connect({
        hostname: process.env.RABBIT_HOST,
        port: Number(process.env.RABBIT_PORT),
        username: process.env.RABBIT_USER,
        password: process.env.RABBIT_PASS
      })

      this.channel = await this.connection.createChannel()
      console.log('✅ RabbitMQService initialized')
    } catch (err) {
      console.error('Failed to initialize RabbitMQ:', err)
      throw err
    }
  }

  async listenToQueue (queueName: string): Promise<void> {
    try {
      await this.channel.assertQueue(queueName, { durable: true })
      await this.channel.prefetch(1)

      console.log(`✅ Listening to queue: ${queueName}`)

      this.channel.consume(
        queueName,
        async msg => {
          if (!msg) return
          this.newMessage = msg
          this.ackMessage = msg.content.toString()

          await this.handleMessage(this.ackMessage)
        },
        { noAck: false }
      )
    } catch (error) {
      console.error('Error listening to queue:', error)
    }
  }

  async handleMessage (message: string): Promise<boolean> {
    try {
      const connectedSockets = tcpService.getConnectedSockets()
      const socket = connectedSockets[0]
      if (socket) {
        const order: PlcSendMessage = JSON.parse(message)
        await axios.post(
          `http://localhost:3000/api/orders/status/pending/${order.orderId}/${order.presId}`,
          {
            machineId: order.machineId
          }
        )
        socketService.getIO().emit('res_message', `Create : 'update order'`)

        const dispensed = await sendCommandFromQueue(
          order.floor,
          order.position,
          order.qty,
          order.machineId,
          order.orderId
        )

        if (dispensed) {
          await axios.post(
            `http://localhost:3000/api/orders/status/receive/${order.orderId}/${order.presId}`,
            {
              machineId: order.machineId
            }
          )
        } else {
          await axios.post(
            `http://localhost:3000/api/orders/status/error/${order.orderId}/${order.presId}`,
            {
              machineId: order.machineId
            }
          )
          if (this.newMessage) {
            this.channel.ack(this.newMessage)
          }
        }
      }

      socketService
        .getIO()
        .emit('res_message', `Successfully : 'Dispense success'`)
      return true
    } catch (error) {
      console.error('Error processing message:', error)
      return false
    }
  }

  acknowledgeMessage (): void {
    if (this.newMessage) {
      this.channel.ack(this.newMessage)
      console.log(`Acknowledged message: ${this.ackMessage}`)
    }
  }

  async sendOrder (
    order: PlcSendMessage | PlcSendMessage[],
    queue: string
  ): Promise<void> {
    try {
      await this.channel.assertQueue(queue, { durable: true })
      if (Array.isArray(order)) {
        order.forEach(item => {
          this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(item)), {
            persistent: true
          })
        })
      } else {
        this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)), {
          persistent: true
        })
      }
    } catch (err) {
      console.error('Failed to send order:', err)
      throw err
    }
  }

  async cancelQueue (queue: string): Promise<void> {
    try {
      await this.channel.purgeQueue(queue)
    } catch (err) {
      console.error('Failed to purge queue:', err)
      throw err
    }
  }

  getChannel (): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized')
    }
    return this.channel
  }

  async deleteQueue (queue: string): Promise<void> {
    try {
      await this.channel.deleteQueue(queue)
    } catch (err) {
      console.error('Failed to delete queue:', err)
      throw err
    }
  }

  async deleteAndRecreateQueue (queueName: string): Promise<void> {
    try {
      await this.channel.deleteQueue(queueName)
      console.log(`Deleted queue: ${queueName}`)
      await this.listenToQueue(queueName)
    } catch (error) {
      console.error('Error deleting and recreating queue:', error)
    }
  }

  async closeConnection (): Promise<void> {
    await this.channel.close()
    await this.connection.close()
  }
}

export default RabbitMQService
