import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { Orders } from '@prisma/client'
import RabbitMQService from '@/utils/rabbit'
import prisma from '@/configs/prisma'
import { Prescription, PrescriptionList, ResponsePres } from '@/types/order'
import { getDateFormat } from '@/utils/dateFormat'
import { HttpError } from '@/configs/errorPipe'
import { tcpService } from '@/utils/tcp'
import { socketService } from '@/utils/socket'
import { pad } from '@/utils/padStart'
import axios, { AxiosError } from 'axios'
import { PlcSendMessage } from '@/types/rabbit'
import { getRunning } from '@/utils/checkMachineStatus'

const rabbitService = RabbitMQService.getInstance()

const statusPrescription = async (presNo: string, status: string) => {
  try {
    const response = await prisma.prescription.update({
      where: { id: presNo },
      data: { PresStatus: status }
    })
    return response
  } catch (error) {
    throw error
  }
}

const getPharmacyPres = async (rfid: string) => {
  try {
    const response = await axios.get<ResponsePres>(
      `${process.env.PHARMACY_URL}/getPresTest/${rfid}`
    )
    return response.data.data
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        throw new HttpError(404, 'Data not found')
      }
    }
    throw error
  }
}

const sendOrder = async (
  order: PlcSendMessage | PlcSendMessage[],
  queue: string
): Promise<void> => {
  try {
    const channel = RabbitMQService.getInstance().getChannel()
    await channel.assertQueue(queue, { durable: true })
    if (Array.isArray(order)) {
      order.forEach(item => {
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(item)), {
          persistent: true
        })
      })
    } else {
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)), {
        persistent: true
      })
    }
  } catch (err) {
    throw err
  }
}

const findPrescription = async (rfid: string) => {
  try {
    const result = await prisma.prescription.findFirst({
      where: {
        PresStatus: {
          in: ['ready', 'pending', 'receive']
        },
        id: rfid
      },
      include: { Order: true },
      orderBy: { CreatedAt: 'asc' }
    })
    return result
  } catch (error) {
    throw error
  }
}

const createPresService = async (pres: Prescription): Promise<Orders[]> => {
  try {
    const presList: PrescriptionList[] = pres.Prescription.filter(
      item => item.Machine === 'ADD'
    )

    const checkPres = await prisma.prescription.findFirst({
      where: { id: presList[0]?.f_prescriptionno }
    })

    if (checkPres) {
      throw new HttpError(500, 'รายการนี้กำลังจัดอยู่')
    }

    if (presList.length > 0) {
      const order: Orders[] = presList
        .map(item => {
          return {
            id: `ORD-${item.RowID}`,
            PrescriptionId: item.f_prescriptionno,
            OrderItemId: item.f_orderitemcode,
            OrderItemName: item.f_orderitemname,
            OrderQty: item.f_orderqty,
            OrderUnitcode: item.f_orderunitcode,
            Machine: item.Machine,
            Command: item.command,
            OrderStatus: 'ready',
            Floor: parseInt(item.f_binlocation.substring(0, 1)),
            Position: parseInt(item.f_binlocation.substring(1)),
            Slot: null,
            CreatedAt: getDateFormat(new Date()),
            UpdatedAt: getDateFormat(new Date())
          }
        })
        .sort((a, b) => a.Floor - b.Floor)

      const warnings: string[] = await Promise.all(
        order.map(async items => {
          try {
            const ins = await prisma.inventory.findFirst({
              where: { DrugId: items.OrderItemId }
            })
            if (!ins) return
            if (ins.InventoryQty < items.OrderQty) {
              return {
                message: `จำนวนยาในสต๊อกเหลือน้อยกว่าจำนวนที่จัด`,
                inventoryRemaining: ins.InventoryQty,
                orderQty: items.OrderQty
              }
            }
          } catch (e: any) {
            return e.message
          }
          return null
        })
      )

      const filteredWarnings = warnings.filter(warning => warning !== null)

      await prisma.$transaction([
        prisma.prescription.create({
          // where: { id: presList[0].f_prescriptionno },
          // update: {},
          data: {
            id: presList[0].f_prescriptionno,
            PrescriptionDate: presList[0].f_prescriptiondate,
            Hn: presList[0].f_hn,
            An: presList[0].f_an,
            PatientName: presList[0].f_patientname,
            WardCode: presList[0].f_wardcode,
            WardDesc: presList[0].f_warddesc,
            PriorityCode: presList[0].f_prioritycode,
            PriorityDesc: presList[0].f_prioritydesc,
            PresStatus: 'ready',
            CreatedAt: getDateFormat(new Date()),
            UpdatedAt: getDateFormat(new Date())
          }
        }),
        prisma.orders.createMany({
          data: order,
          skipDuplicates: true
        })
      ])

      if (filteredWarnings.length > 0) {
        order.forEach((item, index) => {
          ;(item as any).warning = filteredWarnings[index] || null
        })
      }

      return order
    } else {
      throw new HttpError(404, 'Order not found on ADD')
    }
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new HttpError(400, 'This order has already been placed')
    } else {
      throw error
    }
  }
}

const getOrderService = async (): Promise<Orders[]> => {
  try {
    // const splitToken = token?.split(' ')[1]
    // const decoded: jwtDecodeType = jwtDecode(String(splitToken))

    const result = await prisma.orders.findMany({
      include: { DrugInfo: { select: { DrugImage: true } } },
      // where: { Prescription: { UsedBy: { id: decoded.id } } },
      orderBy: { OrderStatus: 'desc' }
    })

    const updatedResult = await Promise.all(
      result.map(async order => {
        const warning = await prisma.inventory
          .findFirst({
            where: { DrugId: order.OrderItemId }
          })
          .then(ins => {
            if (!ins) return
            if (ins.InventoryQty < order.OrderQty) {
              return {
                message: `จำนวนยาในสต๊อกเหลือน้อยกว่าจำนวนที่จัด`,
                inventoryRemaining: ins.InventoryQty,
                orderQty: order.OrderQty
              }
            }
            return null
          })
          .catch(e => e.message)

        return { ...order, warning }
      })
    )

    return updatedResult
  } catch (error) {
    throw error
  }
}

const received = async (drugId: string, id: string): Promise<Orders> => {
  try {
    // const notready = await prisma.orders.findMany({
    //   where: { OrderStatus: { equals: 'receive' } }
    // })

    // if (notready.length >= 2) {
    //   throw new Error(`ไม่สามารถรับยาได้กรุณานำยาออกจากช่องก่อน!`)
    // }
    const connectedSockets = tcpService.getConnectedSockets()
    const socket = connectedSockets[0]

    const result = await prisma.orders.findFirst({
      where: {
        OrderItemId: drugId
      }
    })

    if (!result) {
      throw new Error(`Order with ID ${drugId} not found`)
    }

    if (result.OrderStatus === 'receive' || result.OrderStatus === 'error') {
      await updateOrder(result.id, 'complete')
      const value = await findOrders(['complete', 'error'])
      if (value.length === 0)
        await statusPrescription(result.PrescriptionId, 'complete')

      const checkMachineStatus = async (
        cmd: string
      ): Promise<{ status: string; raw: string }> => {
        const running = await getRunning(id)
        return new Promise(resolve => {
          const m = parseInt(cmd.slice(1))
          const sumValue = 0 + 0 + 0 + 0 + 0 + m + 0 + running + 4500
          const sum = pad(sumValue, 2).slice(-2)
          const checkMsg = `B00R00C00Q0000L00${cmd}T00N${running}D4500S${sum}`

          console.log(`📤 Sending status check command: ${checkMsg}`)
          socket.write(checkMsg)

          const onData = (data: Buffer) => {
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

          socket.on('data', onData)
        })
      }

      if (socket) {
        const startTime = Date.now()
        const timeout = 3 * 60 * 1000 // 3 นาที
        let round = 1

        while (true) {
          const status = await checkMachineStatus('M38') // เช็คประตู
          console.log(`status: ${round}`, status.status)

          if (status.status === '30') {
            // ประตูปิดแล้ว
            rabbitService.acknowledgeMessage()
            socketService
              .getIO()
              .emit('res_message', `Receive Order : ${result.id}`)
            round + 1
            break
          }

          const elapsed = Date.now() - startTime
          if (elapsed > timeout) {
            // ครบเวลา 3 นาที แต่ประตูยังไม่ปิด
            console.error('Timeout: ประตูไม่ปิดภายใน 3 นาที')
            rabbitService.acknowledgeMessage()
            socketService
              .getIO()
              .emit(
                'res_message',
                `Timeout: ประตูไม่ปิดภายใน 3 นาที สำหรับ Order : ${result.id}`
              )
            round + 1
            break
          }

          await new Promise(resolve => setTimeout(resolve, 1000)) // รอ 1 วิ ก่อนเช็คใหม่
        }
      }
    } else {
      throw new Error('This item is not in a ready to receive drug')
    }

    return result
  } catch (error) {
    throw error
  }
}

const updateStatusOrderServicePending = async (
  id: string,
  status: string,
  presId: string,
  machineId: string
) => {
  try {
    const machine = await prisma.machines.findUnique({
      where: { id: machineId }
    })
    if (!machine) throw new HttpError(404, 'Machine not found')

    const socket = tcpService
      .getConnectedSockets()
      .find(s => s.remoteAddress === machine.IP)

    const order = await prisma.orders.findUnique({
      where: { OrderItemId: id, PrescriptionId: presId }
    })

    if (!order) throw new HttpError(404, 'ไม่พบรายการ!')

    const validStatusTransitions: { [key: string]: string } = {
      pending: 'ready',
      receive: 'pending',
      complete: 'receive',
      error: 'pending',
      ready: 'pending'
    }

    if (order.OrderStatus !== validStatusTransitions[status]) {
      if (status === 'error' && order.OrderStatus === 'pending') {
        throw new HttpError(
          400,
          'รายการอยู่ระหว่างดำเนินการและยังไม่ได้อยู่ในสถานะรับ!'
        )
      }

      throw new HttpError(
        400,
        `ไม่สามารถเปลี่ยนสถานะจาก ${order.OrderStatus} ไปเป็น ${status} ได้`
      )
    }

    await prisma.orders.update({
      where: { OrderItemId: id },
      data: { OrderStatus: status, UpdatedAt: getDateFormat(new Date()) }
    })

    if (status === 'error') return

    const relatedOrders = await prisma.orders.findMany({
      where: { PrescriptionId: presId },
      select: { OrderStatus: true }
    })

    const allCompletedOrErrored = relatedOrders.every(
      o => o.OrderStatus === 'complete' || o.OrderStatus === 'error'
    )

    if (allCompletedOrErrored) {
      await prisma.prescription.update({
        where: { id: presId },
        data: { PresStatus: 'complete', UpdatedAt: getDateFormat(new Date()) }
      })
    }

    const result = await prisma.prescription.findFirst({
      where: {
        id: presId,
        AND: { Order: { every: { OrderStatus: { contains: 'complete' } } } }
      },
      include: { Order: true }
    })

    const checkMachineStatus = async (
      cmd: string
    ): Promise<{ status: string; raw: string }> => {
      if (!socket) {
        throw new Error('ไม่มีการเชื่อมต่อกับ PLC')
      }

      const running = await getRunning(id)

      return new Promise((resolve, reject) => {
        const m = parseInt(cmd.slice(1))
        const sumValue = 0 + 0 + 0 + 0 + 0 + m + 0 + running + 4500
        const sum = pad(sumValue, 2).slice(-2)
        const checkMsg = `B00R00C00Q0000L00${cmd}T00N${running}D4500S${sum}`

        console.log(`📤 Sending status check command: ${checkMsg}`)
        socket.write(checkMsg)

        const timeout = setTimeout(() => {
          socket.off('data', onData)
          reject(new Error('Timeout: PLC ไม่ตอบสนองภายใน 5 วินาที'))
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

    if (socket && status === 'receive') {
      try {
        const trayStatus = await checkMachineStatus('M39')
        console.log('🔍 Tray status check:', trayStatus.status)

        if (trayStatus.status !== '37') {
          console.log('✅ Tray not full, acknowledging message')
          if (rabbitService.acknowledgeMessage) {
            rabbitService.acknowledgeMessage()
          }
        } else {
          console.log('⚠️ Tray is full, waiting for door to close')

          const startTime = Date.now()
          const timeout = 3 * 60 * 1000
          let round = 1
          let doorClosed = false

          while (!doorClosed) {
            try {
              const doorStatus = await checkMachineStatus('M38')
              console.log(
                `🚪 Door status check round ${round}:`,
                doorStatus.status
              )

              if (doorStatus.status === '30') {
                console.log('✅ Door is closed')
                doorClosed = true

                if (rabbitService.acknowledgeMessage) {
                  rabbitService.acknowledgeMessage()
                }

                if (socketService.getIO) {
                  socketService
                    .getIO()
                    .emit('res_message', `Receive Order: ${result?.id}`)
                }
                break
              }

              const elapsed = Date.now() - startTime
              if (elapsed > timeout) {
                console.error('⏰ Timeout: ประตูไม่ปิดภายใน 3 นาที')

                if (rabbitService.acknowledgeMessage) {
                  rabbitService.acknowledgeMessage()
                }

                if (socketService.getIO) {
                  socketService
                    .getIO()
                    .emit(
                      'res_message',
                      `Timeout: ประตูไม่ปิดภายใน 3 นาที สำหรับ Order: ${result?.id}`
                    )
                }
                break
              }

              await new Promise(resolve => setTimeout(resolve, 1000))
              round++
            } catch (doorCheckError) {
              console.error('❌ Error checking door status:', doorCheckError)
              break
            }
          }
        }
      } catch (plcError) {
        console.error('❌ Error in PLC status checking:', plcError)
        if (rabbitService.acknowledgeMessage) {
          rabbitService.acknowledgeMessage()
        }
      }
    }

    return result as unknown as Orders
  } catch (error) {
    console.error('❌ Error in updateStatusOrderServicePending:', error)
    throw error
  }
}

const updateOrder = async (
  orderId: string,
  orderStatus: string
): Promise<Orders | undefined> => {
  try {
    const result: Orders = await prisma.orders.update({
      where: { OrderItemId: orderId },
      data: { OrderStatus: orderStatus }
    })
    return result
  } catch (error) {
    throw error
  }
}

const findOrders = async (condition: string[]): Promise<Orders[]> => {
  try {
    const result: Orders[] = await prisma.orders.findMany({
      where: { OrderStatus: { in: condition } }
    })
    return result
  } catch (error) {
    throw error
  }
}

const clearAllOrder = async (): Promise<string> => {
  try {
    await RabbitMQService.getInstance().cancelQueue('orders')
    await prisma.$transaction([
      prisma.orders.deleteMany(),
      prisma.prescription.deleteMany(),
      // prisma.inventory.updateMany({
      //   // where: {
      //   //   InventoryQty: {
      //   //     lt: 10
      //   //   }
      //   // },
      //   data: {
      //     InventoryQty: 3
      //   }
      // }),
      // prisma.machines.update({
      //   where: { id: 'MAC-fa5e8202-1749-4fc7-93b9-0e4b373a56e9' },
      //   data: { MachineSlot1: false, MachineSlot2: false }
      // })
    ])
    return 'Successfully'
  } catch (error) {
    throw error
  }
}

const deletePrescription = async (presNo: string) => {
  try {
    if (presNo === '0') {
      await prisma.orders.deleteMany()
      await prisma.prescription.deleteMany()
      await prisma.machines.update({
        where: { id: 'DEVICE-TEST' },
        data: { MachineSlot1: false, MachineSlot2: false }
      })
    } else {
      await prisma.orders.deleteMany({
        where: { PrescriptionId: presNo }
      })
      await prisma.prescription.delete({
        where: { id: presNo }
      })
    }
  } catch (error) {
    throw error
  }
}

export {
  findPrescription,
  createPresService,
  getOrderService,
  received,
  updateStatusOrderServicePending,
  clearAllOrder,
  findOrders,
  updateOrder,
  statusPrescription,
  getPharmacyPres,
  sendOrder,
  deletePrescription
}
