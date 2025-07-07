import { CheckMachineStatusType, PlcCommand, PlcCommandTwo, PLCStatusError } from '../types/checkMachine'
import { getMachineRunningCheck, getRunning } from './checkMachineStatus'
import { pad } from './padStart'
import { createPlcCommand } from '../constants/checkMachineStatus'
import { Socket } from 'net'
import axios from 'axios'
import { socketService } from './socket'

interface commandQueueType {
  status: number,
  data: string
}

async function trySendCommandWithRetry(cmd: string, socket: Socket, machineId: string) {
  const MAX_RETRIES = 5
  const TIMEOUT_MS = 1500

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await Promise.race([
        sendCommandtoCheckMachineStatusShared(cmd, socket, machineId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
        ),
      ])
      return result as PlcCommandResponse
    } catch (err) {
      console.warn(`Attempt ${attempt} failed: ${err}`)
      if (attempt === MAX_RETRIES) {
        throw new Error("All attempts failed.")
      }
    }
  }
}

const checkMachineStatusShared = async (
  socket: Socket,
  bodyData: CheckMachineStatusType
): Promise<CommandResult> => {
  const { floor, machineId, position, qty, orderId } = bodyData
  let mode: PlcCommandTwo = PlcCommandTwo.DispenseRight

  for (const cmd of [
    PlcCommandTwo.CheckDoor,
    PlcCommandTwo.CheckTray,
    PlcCommandTwo.CheckShelf
  ]) {
    try {
      const result = await trySendCommandWithRetry(cmd, socket, machineId)
      const status = result?.status

      if (!status) throw new PLCStatusError(`❌ เครื่องไม่พร้อม (${cmd}) -> ${status}`)

      console.info("Round 1 check ", cmd, ": ", status)

      if (cmd === PlcCommandTwo.CheckTray) {
        if (status === '34') {
          await axios.post(
            `http://localhost:3000/api/orders/slot/update/${orderId}`,
            {
              slot: 'M01'
            }
          )
          mode = PlcCommandTwo.DispenseRight
        } else if (status === '35') {
          await axios.post(
            `http://localhost:3000/api/orders/slot/update/${orderId}`,
            {
              slot: 'M02'
            }
          )
          mode = PlcCommandTwo.DispenseLeft
        } else if (status === '36') {
          await axios.post(
            `http://localhost:3000/api/orders/slot/update/${orderId}`,
            {
              slot: 'M01'
            }
          )
          mode = PlcCommandTwo.DispenseRight
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
      // Emit event plc-error ให้ frontend รับรู้ error นี้ได้
      if (err instanceof PLCStatusError) {
        socketService.getIO().emit('plc-error', {
          status: 'error',
          message: err.message,
          command: cmd,
          timestamp: new Date().toISOString(),
          machineId,
        });
        throw err
      }
      // กรณี error อื่น ๆ
      socketService.getIO().emit('plc-error', {
        status: 'error',
        message: `เกิดข้อผิดพลาดระหว่างเช็ค ${cmd}`,
        command: cmd,
        timestamp: new Date().toISOString(),
        machineId,
      });
      throw new PLCStatusError(`เกิดข้อผิดพลาดระหว่างเช็ค ${cmd}`)
    }
  }

  return await sendCommandWithRetry(socket, floor, position, qty, mode, machineId) as commandQueueType
}

async function sendCommandWithRetry(
  socket: Socket,
  floor: number,
  position: number,
  qty: number,
  mode: string,
  machineId: string
) {
  const MAX_RETRIES = 5
  const TIMEOUT_MS = 1500

  return new Promise(async (resolve, reject) => {
    let attempt = 0
    let got91 = false
    let timeoutId: NodeJS.Timeout

    const sendCommand = async () => {
      attempt++
      if (attempt > MAX_RETRIES) {
        socket.off('data', onData)
        return reject(new Error('📛 ส่งคำสั่งแล้วแต่ PLC ไม่ตอบกลับภายในเวลา 1.5 วินาที (รวม 5 ครั้ง)'))
      }

      const running = await getRunning(machineId)
      const message = createPlcCommand(floor, position, qty, mode, running)
      console.info(`📤 [Attempt ${attempt}] Final PLC command:`, message)
      socket.write(message)

      timeoutId = setTimeout(() => {
        if (!got91) {
          console.warn(`⌛ Timeout waiting for 91 response on attempt ${attempt}, retrying...`)
          sendCommand()
        }
      }, TIMEOUT_MS)
    }

    const onData = (data: Buffer) => {
      const responseText = data.toString()
      const responseStatus = responseText.split("T")[1]?.slice(0, 2)
      console.info('📥 PLC Response:', responseText, '| Status:', responseStatus)

      if (responseStatus === '91') {
        got91 = true
        clearTimeout(timeoutId)
        console.info('✅ ได้ 91 แล้ว กำลังรอ 92...')
         socketService.getIO().emit('plc-finish-task', {
          status: responseStatus,
          message: `Finish task: ${responseStatus}`,
          timestamp: new Date().toISOString(),
          machineId,
        })

      } else if (responseStatus === '92') {
        if (got91) {
          socket.off('data', onData)
          return resolve({
            status: 100,
            data: responseText
          })
        } else {
          console.warn('⚠️ ได้ 92 แต่ยังไม่เคยได้ 91 — ยังไม่ resolve')
        }
      }
    }

    socket.on('data', onData)
    await sendCommand()
  })
}

const sendCommandtoCheckMachineStatusShared = async (
  cmd: string,
  socket: Socket,
  machineId: string
): Promise<PlcCommandResponse> => {
  return new Promise(async (resolve, reject) => {
    const runningCheck = await getMachineRunningCheck(machineId)
    const m = parseInt(cmd.slice(1))
    const sumValue = 0 + 0 + 0 + 0 + 0 + m + 0 + runningCheck + 4500
    const sum = pad(sumValue, 2).slice(-2)
    const checkMsg = `B00R00C00Q0000L00${cmd}T00N${runningCheck}D4500S${sum}`

    console.log(`📤 Sending status check command: ${checkMsg}`)
    socket.write(checkMsg)

    let responded = false

    const onData = (data: Buffer) => {
      if (responded) return

      responded = true
      const message = data.toString()
      const status = message.split('T')[1]?.substring(0, 2) ?? '00'
      
      socket.off('data', onData)

      console.log(
        `📥 Response from PLC (${cmd}):`,
        message,
        '| Status T:',
        status
      )

      resolve({ status, raw: message })
    }

    socket.once('data', onData)
  })
}

const successStatuses = ['30', '34', '35', '36', '20', '37']
const failStatuses = ['37', '33', '21', '22', '23', '24', '25', '26', '27', '31', '32']

export { checkMachineStatusShared }