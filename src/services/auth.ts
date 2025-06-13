import fs from 'node:fs'
import path from 'node:path'
import { Users } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { sign } from 'jsonwebtoken'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import CryptoJS from 'crypto-js'
import prisma from '@/configs/prisma'
import { HttpError } from '@/configs/errorPipe'
import { GenQr } from '@/types/user'
import { hashPassword, hashPasswordCompare } from '@/utils/hash'
import { getDateFormat } from '@/utils/dateFormat'
// import { jwtDecode } from "jwt-decode";

const userRegister = async (
  body: Users,
  pic?: Express.Multer.File
): Promise<Users | undefined> => {
  try {
    // const splitToken = token?.split(' ')[1]
    // const decoded: jwtDecodeType = jwtDecode(String(splitToken))
    const UUID = `UID-${uuidv4()}`
    const result = await prisma.users.create({
      select: {
        id: true,
        UserName: true,
        DisplayName: true,
        UserImage: true,
        UserRole: true,
        UserStatus: true,
        CreateBy: true,
        CreatedAt: true,
        UpdatedAt: true
      },
      data: {
        id: UUID,
        UserName: body.UserName.toLowerCase(),
        UserPassword: await hashPassword(body.UserPassword.toLowerCase()),
        UserPincode: String(
          CryptoJS.AES.encrypt(
            body.UserPincode.toLowerCase(),
            `${process.env.CRYPTO_SECRET}`
          )
        ),
        DisplayName: body.DisplayName,
        UserImage: !pic ? null : `/img/users/${pic.filename}`,
        UserRole: body.UserRole,
        UserStatus: true,
        CreateBy: 'decoded',
        CreatedAt: getDateFormat(new Date()),
        UpdatedAt: getDateFormat(new Date())
      }
    })
    return result as unknown as Users
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        if (pic)
          fs.unlinkSync(path.join('public/images/users', String(pic.filename)))
        throw new HttpError(400, 'Username already exists')
      }
    }
    throw error
  }
}

const createQrEncrypt = async (id: string): Promise<GenQr> => {
  try {
    const result = await prisma.users.findFirst({
      where: { id: id }
    })
    return {
      pinCode: result!.UserPincode as string
    }
  } catch (error) {
    throw error
  }
}

const userLogin = async (body: Users): Promise<Users> => {
  try {
    const result = await prisma.users.findFirst({
      where: { UserName: body.UserName.toLowerCase() }
    })
    if (result) {
      if (!result.UserStatus) throw new HttpError(403, 'User is inactive')
      const match = await hashPasswordCompare(
        body.UserPassword.toLowerCase(),
        result.UserPassword
      )
      if (match) {
        const {
          id: id,
          UserRole: userRole,
          UserImage: userImage,
          DisplayName: displayName,
          UserStatus: userStatus
        } = result
        const token: string = sign(
          { id, userRole, displayName, userStatus },
          String(process.env.JWT_SECRET),
          { expiresIn: '7d' }
        )
        return {
          token,
          id,
          userRole,
          userStatus,
          displayName,
          userImage
        } as unknown as Users
      } else {
        throw new HttpError(403, 'Password incorrect')
      }
    } else {
      throw new HttpError(404, 'User not found')
    }
  } catch (error) {
    throw error
  }
}

const userLoginQR = async (id: string): Promise<Users> => {
  try {
    const decrypt = CryptoJS.AES.decrypt(
      id,
      `${process.env.CRYPTO_SECRET}`
    ).toString(CryptoJS.enc.Utf8)
    const result = await prisma.users.findFirst({
      where: { UserPincode: id }
    })
    const storeEcryppt = CryptoJS.AES.decrypt(
      String(result?.UserPincode),
      `${process.env.CRYPTO_SECRET}`
    ).toString(CryptoJS.enc.Utf8)
    if (result) {
      if (!result.UserStatus) throw new HttpError(403, 'User is inactive')
      const match = decrypt.includes(storeEcryppt)
      if (match) {
        const {
          id: id,
          UserRole: userRole,
          UserImage: userImage,
          DisplayName: displayName,
          UserStatus: userStatus
        } = result
        const token: string = sign(
          { id, userRole, displayName, userStatus },
          String(process.env.JWT_SECRET),
          { expiresIn: '7d' }
        )
        return {
          token,
          id,
          userRole,
          userStatus,
          displayName,
          userImage
        } as unknown as Users
      } else {
        throw new HttpError(403, 'Password incorrect')
      }
    } else {
      throw new HttpError(404, 'User not found')
    }
  } catch (error) {
    throw error
  }
}

export { userRegister, createQrEncrypt, userLogin, userLoginQR }
