const multer = require("multer");
const path = require("path");
import { v4 as uuidv4 } from 'uuid';
const uploadFile = multer({
    limits: 800000,
    storage: multer.diskStorage({
        destination: (req: any, file: any, cb: any) => {
            cb(null, 'upload/images')
        },
        filename: (req: any, file: any, cb: any) => {
            let ext = path.extname(file.originalname);
            cb(null, `${uuidv4()}${ext}`)
        }
    })

})
const uploadImage = multer({
    limits: 800000,
    storage: multer.diskStorage({
        destination: (req: any, file: any, cb: any) => {
            
            cb(null, 'upload/images')
        },
        filename: (req: any, file: any, cb: any) => {
           
            let ext = path.extname(file.originalname);
            cb(null, `${uuidv4()}${ext}`)
        }
    }),
    fileFilter: (req: any, file: any, cb: any) => {
        
        const allowedFileType = ["jpg", "jpeg", "png"];
        if (allowedFileType.includes(file.mimetype.split("/")[1])) {
         
            cb(null, true)
        } else {
          
            cb(null, false)
        }
    }
})
module.exports = { uploadImage, uploadFile };