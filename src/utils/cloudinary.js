import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
  api_key: process.env.CLOUDINARY_API_KEY , 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//takes a file from the local server and uploads it on Cloudinary
export const uploadOnCloudinary = async(localFilePath) =>{
    try {
        //check if there's no localFilePath return null
        if(!localFilePath) return ;
        //upload the file on Cloudinary :
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"});
        //If File has been uploaded successfully :
        console.log("File is uploaded on Cloudinary",response.url);
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
        return response;
    }
    catch(error) {
        console.log(error) //IMPORTANT
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed 
        return ;
    }
}

