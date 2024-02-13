import multer from "multer";


//the following code helps in uploading the file from system to public/temp directory
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./") 
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
 export const upload = multer({ storage, })