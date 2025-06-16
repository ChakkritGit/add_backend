interface QueueList {
  cmd: string
  orderId: string
}

interface PlcSendMessage {
  machineId: string
  presId?: string
  orderId?: string
  floor: number
  position: number
  qty: number
}

export type { QueueList, PlcSendMessage }
