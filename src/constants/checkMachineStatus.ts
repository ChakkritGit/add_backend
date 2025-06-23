import { pad } from '@/utils/padStart'

const checkCommands = ['M38', 'M39', 'M40']
const successStatuses = ['34', '35', '36', '30', '20', '36', '37']
const failStatuses = ['37','33','21','22','23','24','25','26','27','31','32']

const calculateChecksum = (
  floor: number,
  position: number,
  qty: number,
  color: number,
  commandValue: number,
  returnValue: number,
  transition: number,
  device: number
): string => {
  const total =
    0 +
    floor +
    position +
    qty +
    color +
    commandValue +
    returnValue +
    transition +
    device
  return pad(total, 2).slice(-2)
}

const createPlcCommand = (
  floor: number,
  position: number,
  qty: number,
  mode: string,
  running: number,
  color: number = 1
): string => {
  const commandValue = parseInt(mode.slice(1))
  const returnValue = 0
  const device = 4500

  const checksum = calculateChecksum(
    floor,
    position,
    qty,
    color,
    commandValue,
    returnValue,
    running,
    device
  )

  return `B00R${pad(floor, 2)}C${pad(position, 2)}Q${pad(qty, 4)}L${pad(
    color,
    2
  )}${mode}T00N${running}D${device}S${checksum}`
}

const createSimpleCommand = (
  mode: string,
  running: number,
  color: number = 0
): string => {
  const floor = 0
  const position = 0
  const qty = 0
  const commandValue = parseInt(mode.slice(1))
  const returnValue = 0
  const device = 4500

  const checksum = calculateChecksum(
    floor,
    position,
    qty,
    color,
    commandValue,
    returnValue,
    running,
    device
  )

  return `B00R00C00Q0000L${pad(
    color,
    2
  )}${mode}T00N${running}D${device}S${checksum}`
}

const interpretPlcResponse = (raw: string): string => {
  const status = raw.split('T')[1]?.substring(0, 2) ?? '00'
  switch (status) {
    case '30':
      return 'ประตูทั้งสองล็อก'
    case '31':
      return 'ประตูฝั่งซ้ายล็อก'
    case '32':
      return 'ประตูฝั่งขวาล็อก'
    case '33':
      return 'ประตูทั่งสองฝั่งไม่ได้ล็อก'
    case '34':
      return 'ช่องจ่ายยาขวาว่าง'
    case '35':
      return 'ช่องจ่ายยาซ้ายว่าง'
    case '36':
      return 'หยุดแสดงไฟขวา'
    case '37':
      return 'ช่องจ่ายยาเต็ม'
    case '91':
      return 'รับคำสั่งแล้ว'
    case '92':
      return 'จ่ายยาสำเร็จ'
    case '01':
      return 'ขาดการเชื่อมต่อจากเซิร์ฟเวอร์'
    case '02':
      return 'คำสั่งไม่ถูกต้อง'
    case '03':
      return 'Checksum ผิด'
    default:
      return `ไม่รู้จักสถานะ: ${status}`
  }
}

export {
  checkCommands,
  successStatuses,
  failStatuses,
  calculateChecksum,
  createPlcCommand,
  interpretPlcResponse,
  createSimpleCommand
}
