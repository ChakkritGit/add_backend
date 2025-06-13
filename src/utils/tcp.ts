import net, { Socket } from 'net'

class TcpService {
  private static instance: TcpService
  private server: net.Server | null = null
  private connectedSockets: Socket[] = []

  private constructor () {}

  static getInstance (): TcpService {
    if (!TcpService.instance) {
      TcpService.instance = new TcpService()
    }
    return TcpService.instance
  }

  initialize (ipAddress: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        return resolve()
      }

      this.server = net.createServer((socket: Socket) => {
        console.log('New TCP client connected:', socket.remoteAddress)

        this.connectedSockets.push(socket)

        socket.on('data', data => {
          console.log(`Received data from client: ${data.toString()}`)
          socket.write('Hello from TCP Server!')
        })

        socket.on('end', () => {
          console.log('Client disconnected')
          this.connectedSockets = this.connectedSockets.filter(
            s => s !== socket
          )
        })
      })

      this.server.listen(port, () => {
        console.log(`TCP Server is running on http://${ipAddress}:${port}`)
        resolve()
      })

      this.server.on('error', (err: Error) => {
        reject(err)
      })
    })
  }

  getConnectedSockets (): Socket[] {
    return this.connectedSockets
  }

  getServer (): net.Server {
    if (!this.server) {
      throw new Error('TCP Server has not been initialized!')
    }
    return this.server
  }
}

export const tcpService = TcpService.getInstance()
