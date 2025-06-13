import bcrypt from 'bcrypt'

const hashPassword = (pass: string) => {
  return new Promise<string>((resolve, reject) => {
    bcrypt.hash(pass, 10, (err, hash) => {
      if (err) reject(err)
      resolve(hash)
    })
  })
}

const hashPasswordCompare = (passBase: string, passHash: string) => {
  return new Promise<boolean>((resolve, reject) => {
    bcrypt.compare(passBase, passHash, (err, hash) => {
      if (err) reject(err)
      resolve(hash)
    })
  })
}

export { hashPassword, hashPasswordCompare }
