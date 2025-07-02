import { Router } from 'express'
import { verifyToken } from '../middlewares/authToken'
import { upload } from '../middlewares/upload'
import { createDrug, deleteDrug, editDrug, getDrug, getDrugById } from '../controllers/drug'

const drugRouter: Router = Router()

drugRouter.get('/', verifyToken, getDrug)
drugRouter.get('/:id', verifyToken, getDrugById)
drugRouter.post('/', upload.single('fileupload'), verifyToken, createDrug)
drugRouter.put('/:id', upload.single('fileupload'), verifyToken, editDrug)
drugRouter.delete('/:id', verifyToken, deleteDrug)

export default drugRouter
