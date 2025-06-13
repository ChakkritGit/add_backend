import { Users } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import prisma from '@/configs/prisma'
import { HttpError } from '@/configs/errorPipe'
import { getDateFormat } from '@/utils/dateFormat'
import { getUserImage } from '@/utils/image'

const usersList = async (): Promise<Users[]> => {
  try {
    const result = await prisma.users.findMany({
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
      orderBy: { CreatedAt: 'desc' }
    })
    if (result.length > 0) return result as Users[]
    throw new HttpError(404, 'Users not found')
  } catch (error) {
    throw error
  }
}

const findUsers = async (userId: string): Promise<Users> => {
  try {
    const result = await prisma.users.findUnique({
      where: {
        id: userId
      },
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
      }
    })
    if (!result) throw new HttpError(404, 'User not found')
    return result as unknown as Users
  } catch (error) {
    throw error
  }
}

const modifyUser = async (
  userId: string,
  body: Users,
  pic?: Express.Multer.File
): Promise<Users> => {
  try {
    const filename = await getUserImage(userId)
    if (body.UserStatus)
      body.UserStatus = String(body.UserStatus) == '1' ? true : false
    body.UserImage = !pic ? filename || null : `/img/users/${pic.filename}`
    body.UpdatedAt = getDateFormat(new Date())
    const result = await prisma.users.update({
      where: {
        id: userId
      },
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
      data: body
    })
    if (pic && !!filename)
      fs.unlinkSync(path.join('public/images/users', filename.split('/')[3]))
    return result as Users
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        fs.unlinkSync(path.join('public/images/users', pic!.filename))
        throw new HttpError(404, 'User not found to update')
      }
    }
    fs.unlinkSync(path.join('public/images/users', pic!.filename))
    throw error
  }
}

const removeUser = async (userId: string): Promise<Users> => {
  try {
    const filename = await getUserImage(userId)
    const result = await prisma.users.delete({
      where: {
        id: userId
      },
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
      }
    })
    if (!!filename)
      fs.unlinkSync(path.join('public/images/users', filename.split('/')[3]))
    return result as Users
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new HttpError(404, 'User not found')
      }
    }
    throw error
  }
}

export { usersList, findUsers, modifyUser, removeUser }
