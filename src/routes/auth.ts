import { Router } from "express"
import { upload } from "../middlewares/upload"
import { checkLogin, createUser, generateQR } from "../controllers/auth"
// import { verifyToken } from "../middlewares"

const authRouter: Router = Router()

authRouter.post('/login', checkLogin)
authRouter.get('/qr/:id',  generateQR)
authRouter.post('/register', upload.single('fileupload'), createUser)

export default authRouter