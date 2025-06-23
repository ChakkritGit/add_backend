type CheckMachineStatusType = {
  floor: number
  position: number
  qty: number
  machineId: string
  command?: PlcCommand
  orderId?: string
}

class PLCStatusError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'PLCStatusError'
  }
}

enum PlcCommand {
  M01 = 'DispenseRight',
  M02 = 'DispenseLeft',
  M38 = 'CheckDoor',
  M39 = 'CheckTray',
  M40 = 'CheckShelf',
  M30 = 'Reboot',
  M31 = 'Reset',
  M32 = 'ShowModules',
  M33 = 'HideModules',
  M34 = 'UnlockRight',
  M35 = 'UnlockLeft',
  M36 = 'OffRight',
  M37 = 'OffLeft',
  DispenseRight = "DispenseRight",
  CheckDoor = "CheckDoor",
  CheckTray = "CheckTray",
  CheckShelf = "CheckShelf",
  DispenseLeft = "DispenseLeft"
}

enum PlcCommandTwo {
  CheckDoor = 'M38',
  CheckTray = 'M39',
  CheckShelf = 'M40',
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
export { PLCStatusError, PlcCommand, PlcStatus, PlcCommandTwo }
