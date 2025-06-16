import { PlcCommand, PLCStatusError } from '@/types/checkMachine'
import { getMachineRunningCheck } from './checkMachineStatus'
import { pad } from './padStart'
import { createPlcCommand } from '@/constants/checkMachineStatus'
import { Socket } from 'net'

const checkMachineStatusShared = async (
  socket: Socket,
  bodyData: CheckMachineStatusType,
  running: number
): Promise<CommandResult> => {
  const { floor, id, position, qty } = bodyData

  let mode: PlcCommand = PlcCommand.DispenseRight

  for (const cmd of [
    PlcCommand.CheckDoor,
    PlcCommand.CheckTray,
    PlcCommand.CheckShelf
  ]) {
    try {
      const runningCheck = await getMachineRunningCheck(id)
      const result = await sendCommandtoCheckMachineStatusShared(
        cmd,
        runningCheck,
        socket
      )
      const status = result.status

      if (cmd === PlcCommand.CheckTray) {
        if (status === '35') {
          mode = PlcCommand.DispenseLeft
        } else if (status === '34' || status === '36') {
          mode = PlcCommand.DispenseRight
        } else if (failStatuses.includes(status)) {
          throw new PLCStatusError(`❌ เครื่องไม่พร้อม (${cmd}) -> ${status}`)
        } else {
          throw new PLCStatusError(`⚠️ ไม่รู้จักสถานะ (${cmd}) -> ${status}`)
        }
      } else {
        if (failStatuses.includes(status)) {
          throw new PLCStatusError(`❌ เครื่องไม่พร้อม (${cmd}) -> ${status}`)
        } else if (!successStatuses.includes(status)) {
          throw new PLCStatusError(`⚠️ ไม่รู้จักสถานะ (${cmd}) -> ${status}`)
        }
      }
    } catch (err) {
      console.error(`❌ Error on ${cmd}:`, err)
      if (err instanceof PLCStatusError) {
        throw err
      }
      throw new PLCStatusError(`เกิดข้อผิดพลาดระหว่างเช็ค ${cmd}`)
    }
  }

  const message = createPlcCommand(floor, position, qty, mode, running)
  console.log('📤 Final PLC command:', message)
  socket.write(message)

  return new Promise((resolve, reject) => {
    let responded = false

    const timeout = setTimeout(() => {
      if (!responded) {
        console.warn('⌛ Timeout waiting for response from PLC')
        reject(new PLCStatusError('PLC ไม่ตอบสนองใน 5 วินาที'))
      }
    }, 5000)

    socket.once('data', data => {
      responded = true
      clearTimeout(timeout)
      const responseText = data.toString()
      console.log('📥 Final PLC response:', responseText)

      resolve({
        status: 100,
        data: responseText
      })
    })
  })
}

const sendCommandtoCheckMachineStatusShared = async (
  cmd: string,
  running: number,
  socket: Socket
): Promise<PlcCommandResponse> => {
  return new Promise((resolve, reject) => {
    const m = parseInt(cmd.slice(1))
    const sumValue = 0 + 0 + 0 + 0 + 0 + m + 0 + running + 4500
    const sum = pad(sumValue, 2).slice(-2)
    const checkMsg = `B00R00C00Q0000L00${cmd}T00N${running}D4500S${sum}`

    console.log(`📤 Sending status check command: ${checkMsg}`)
    socket.write(checkMsg)

    let responded = false

    const timeout = setTimeout(() => {
      if (!responded) {
        socket.off('data', onData)
        reject(new PLCStatusError('Timeout: PLC ไม่ตอบสนอง'))
      }
    }, 5000)

    const onData = (data: Buffer) => {
      if (responded) return

      responded = true
      const message = data.toString()
      const status = message.split('T')[1]?.substring(0, 2) ?? '00'

      clearTimeout(timeout)
      socket.off('data', onData)

      console.log(
        `📥 Response from PLC (${cmd}):`,
        message,
        '| Status T:',
        status
      )

      resolve({ status, raw: message })
    }

    socket.on('data', onData)
  })
}

const successStatuses = ['30', '34', '35', '36', '20', '37']
const failStatuses = [
  '37',
  '33',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '31',
  '32'
]

export { checkMachineStatusShared }
