interface CheckMachineStatusType {
  floor: number
  position: number
  qty: number
  id: string
}

interface PlcCommandResponse {
  status: string
  raw: string
}

interface CommandResult {
  status: number
  data: string
}
