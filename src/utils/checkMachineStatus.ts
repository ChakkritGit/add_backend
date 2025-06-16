import prisma from '@/configs/prisma'
import { pad } from '@/utils/padStart'
import { Socket } from 'net'
import { CheckMachineStatusType, PlcCommand } from '@/types/checkMachine'
import {
  createPlcCommand,
  failStatuses,
  successStatuses
} from '@/constants/checkMachineStatus'

const sendCommandtoCheckMachineStatus = async (
  cmd: string,
  running: number,
  socket: Socket
): Promise<{ status: string; raw: string }> => {
  return new Promise((resolve, reject) => {
    const m = parseInt(cmd.slice(1))
    const sumValue = 0 + 0 + 0 + 0 + 0 + m + 0 + running + 4500
    const sum = pad(sumValue, 2).slice(-2)
    const checkMsg = `B00R00C00Q0000L00${cmd}T00N${running}D4500S${sum}`

    console.log(`📤 Sending status check command: ${checkMsg}`)
    socket.write(checkMsg)

    const timeout = setTimeout(() => {
      socket.off('data', onData)
      reject(new Error('Timeout: PLC ไม่ตอบสนอง'))
    }, 5000)

    const onData = (data: Buffer) => {
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

const checkMachineStatus = async (
  socket: Socket,
  bodyData: CheckMachineStatusType,
  running: number
): Promise<{ status: number; data: string }> => {
  const { floor, id, position, qty } = bodyData

  let mode: PlcCommand = PlcCommand.DispenseRight

  for (const cmd of [
    PlcCommand.CheckDoor,
    PlcCommand.CheckTray,
    PlcCommand.CheckShelf
  ]) {
    try {
      const runningCheck = await getMachineRunningCheck(id)
      const result = await sendCommandtoCheckMachineStatus(
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
          throw new Error(`❌ เครื่องไม่พร้อม (${cmd}) -> ${status}`)
        } else {
          throw new Error(`⚠️ ไม่รู้จักสถานะ (${cmd}) -> ${status}`)
        }
      } else {
        if (failStatuses.includes(status)) {
          throw new Error(`❌ เครื่องไม่พร้อม (${cmd}) -> ${status}`)
        } else if (!successStatuses.includes(status)) {
          throw new Error(`⚠️ ไม่รู้จักสถานะ (${cmd}) -> ${status}`)
        }
      }
    } catch (err) {
      console.error(`❌ Error on ${cmd}:`, err)
      throw new Error(`เกิดข้อผิดพลาดระหว่างเช็ค ${cmd}`)
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
        reject(new Error('PLC ไม่ตอบสนองใน 5 วินาที'))
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

const getMachineRunningCheck = async (id: string) => {
  const machine = await prisma.machines.findUnique({
    where: { id }
  })

  if (!machine) {
    throw new Error('Machine not found')
  }

  const current = machine.MachineRunningCheck
  const next = current >= 9 ? 1 : current + 1

  await prisma.machines.update({
    where: { id },
    data: {
      MachineRunningCheck: next
    }
  })

  return current
}

const getRunning = async (id: string) => {
  const machine = await prisma.machines.findUnique({
    where: { id }
  })

  if (!machine) {
    throw new Error('Machine not found')
  }

  const current = machine.Running
  const next = current >= 9 ? 1 : current + 1

  await prisma.machines.update({
    where: { id },
    data: {
      Running: next
    }
  })

  return current
}

export {
  sendCommandtoCheckMachineStatus,
  checkMachineStatus,
  getRunning,
  getMachineRunningCheck
}
