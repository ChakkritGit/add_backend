import os from 'os'

const getServerAddress = (): string => {
  const networkInterfaces = os.networkInterfaces()
  let ipAddress = ''

  for (const iface in networkInterfaces) {
    const ifaceDetails = networkInterfaces[iface]
    if (ifaceDetails) {
      for (const details of ifaceDetails) {
        if (details.family === 'IPv4' && !details.internal) {
          ipAddress = details.address
          break
        }
      }
    }
  }

  return ipAddress
}

export { getServerAddress }
