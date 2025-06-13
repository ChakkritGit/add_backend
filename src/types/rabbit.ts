interface QueueList {
  cmd: string
  orderId: string
}

interface PlcSendMessage {
  floor: number
  position: number
  qty: number
  id: string
  orderId?: string
  presId?: string
}

export type { QueueList, PlcSendMessage }
