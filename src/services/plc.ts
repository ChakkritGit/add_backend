
import prisma from '../configs/prisma'
import { tcpService } from '../utils/tcp'
import { checkMachineStatus, getRunning } from '../utils/checkMachineStatus'
import {
  CheckMachineStatusType,
  PlcCommand,
  PLCStatusError
} from '../types/checkMachine'
import { HttpError } from '../configs/errorPipe'
import {
  createPlcCommand,
  createSimpleCommand
} from '../constants/checkMachineStatus'
import { checkMachineStatusShared } from '../utils/sendMachineQueue'

const sendCommand = async (body: CheckMachineStatusType) => {
  const { floor, position, qty, machineId } = body

  if (!floor || !qty || !position || !machineId) {
    throw new HttpError(400, 'Missing payload values')
  }

  const machine = await prisma.machines.findUnique({ where: { id: machineId } })
  if (!machine) throw new HttpError(404, 'Machine not found')

  const socket = tcpService
    .getConnectedSockets()
    .find(s => s.remoteAddress === machine.IP)
  if (!socket) throw new HttpError(500, 'ยังไม่มีการเชื่อมต่อกับ PLC')

  try {
    const running = await getRunning(machineId)
    const checkResult = await checkMachineStatus(socket, body, running)

    return {
      message: 'จัดยาเสร็จ',
      floor,
      position,
      plcResponse: checkResult.data
    }
  } catch (err) {
    console.error('❌ PLC command failed:', err)
    if (err instanceof PLCStatusError) {
      throw new HttpError(500, err.message)
    } else {
      throw new HttpError(500, (err as Error).message)
    }
  }
}

const sendCommandM = async (body: CheckMachineStatusType) => {
  const { command, floor, position, qty, machineId } = body

  const commandValue = command?.trim().toUpperCase()
  const plcCmd = PlcCommand[commandValue as keyof typeof PlcCommand]

  if (!plcCmd) {
    throw new HttpError(400, 'Invalid command')
  }

  if (plcCmd === PlcCommand.M32) {
    if (floor === undefined || position === undefined || qty === undefined) {
      throw new HttpError(400, 'Missing params for ShowModules (m32)')
    }
  }

  try {
    const running = await getRunning(machineId)

    const findMachine = await prisma.machines.findUnique({
      where: { id: machineId }
    })

    const socket = tcpService.getConnectedSockets().find((f) => f.remoteAddress === findMachine?.IP)

    if (!socket) {
      throw new HttpError(500, 'ยังไม่มีการเชื่อมต่อกับ PLC')
    }

    const message =
      plcCmd === PlcCommand.M32
        ? createPlcCommand(floor!, position!, qty!, String(commandValue), running, 0)
        : createSimpleCommand(String(commandValue), running)

    console.log('📤 Sending to PLC:', message)
    socket.write(message)

    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new HttpError(504, 'PLC ไม่ตอบสนองใน 5 วินาที'))
      }, 5000)

      socket.once('data', data => {
        clearTimeout(timeout)
        resolve({
          message: `✅ Command ${command?.toUpperCase()} sent successfully!`,
          plcResponse: data.toString()
        })
      })
    })
  } catch (err) {
    console.error('❌ PLC command failed:', err)
    if (err instanceof HttpError) throw err
    throw new HttpError(500, (err as Error).message)
  }
}

const sendCommandFromQueue = async (
  floor: number,
  position: number,
  qty: number,
  machineId: string,
  orderId?: string
) => {
  console.info("Send command called...")

  if (!floor || !qty || !position || !machineId) {
    throw new HttpError(400, 'Missing payload values')
  }

  const machine = await prisma.machines.findUnique({ where: { id: machineId } })
  if (!machine) throw new HttpError(404, 'Machine not found')

  const socket = tcpService
    .getConnectedSockets()
    .find(s => s.remoteAddress === machine.IP)
  if (!socket) throw new HttpError(500, 'ยังไม่มีการเชื่อมต่อกับ PLC')

  try {
    const bodyData: CheckMachineStatusType = {
      floor,
      position,
      qty,
      machineId: machineId,
      orderId
    }

    const checkResult = await checkMachineStatusShared(
      socket,
      bodyData
    )

    return {
      message: 'จัดยาเสร็จ',
      floor,
      position,
      plcResponse: checkResult.data
    }
  } catch (err) {
    console.error('❌ PLC command failed:', err)
    if (err instanceof PLCStatusError) {
      throw new HttpError(500, err.message)
    } else {
      throw new HttpError(500, (err as Error).message)
    }
  }
}

export { sendCommand, sendCommandM, sendCommandFromQueue }