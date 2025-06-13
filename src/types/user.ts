type GenQr = {
  pinCode: string
}

type jwtDecodeType = {
  id: string
  userRole: string
  displayName: string
  userStatus: boolean
  iat: number
  exp: number
}

export type { GenQr, jwtDecodeType }
