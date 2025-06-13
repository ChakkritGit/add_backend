import prisma from "@/configs/prisma"

const getUserImage = async (id: string): Promise<string | null | undefined> => {
  try {
    const image = await prisma.users.findUnique({
      where: {
        id: id
      }
    })
    return image?.UserImage
  } catch (err) {
    throw new Error(`ERROR: ${err}`)
  }
}

const getDrugImage = async (id: string): Promise<string | null | undefined> => {
  try {
    const image = await prisma.drugs.findFirst({
      where: {
        id: id
      }
    })
    return image?.DrugImage
  } catch (err) {
    throw new Error(`ERROR: ${err}`)
  }
}

export { getUserImage, getDrugImage }
