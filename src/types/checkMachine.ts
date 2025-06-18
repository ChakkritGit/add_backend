type CheckMachineStatusType = {
  floor: number
  position: number
  qty: number
  id: string
  command?: string
  orderId?: string
}

class PLCStatusError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'PLCStatusError'
  }
}

enum PlcCommand {
  DispenseRight = 'M01',
  DispenseLeft = 'M02',
  CheckDoor = 'M38',
  CheckTray = 'M39',
  CheckShelf = 'M40',
  Reboot = 'M30',
  Reset = 'M31',
  ShowModules = 'M32',
  HideModules = 'M33',
  UnlockRight = 'M34',
  UnlockLeft = 'M35',
  OffRight = 'M36',
  OffLeft = 'M37'
}

enum PlcStatus {
  Success = '30',
  DispenseLeftReady = '35',
  DispenseRightReady = '34',
  LightsOffRight = '36',
  FullBoth = '37',
  Error = '33'
}

export type { CheckMachineStatusType }
export { PLCStatusError, PlcCommand, PlcStatus }
