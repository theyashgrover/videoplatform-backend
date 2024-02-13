import{asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';

const registerUser = asyncHandler( async (req,res) => {
   
   //STEP1 - Get User Details from Frontend
   const { fullName, email, username, password } = req.body
   console.log("Full Name :",fullName + "Email Id :",email + "Username :",username + "Password (Just for testing, will be removed later) :",password)

   //STEP2 - Validation of Empty Entry 
   if(
    [fullName, email, username, password].some((field) => field.trim()==="")
   ) {
    throw new ApiError(400, "All fields are required.")
   }

   //STEP3 - Check if user already exists
   const existedUser = await User.findOne({
    $or: [{username}, {email}]
   })
   if(existedUser){
    throw new ApiError(409, "User with Email or Username already exists.")
   }

   //STEP4 - Checking for Avatar and CoverImage -  (If correctly stored in local server or not)
   const avatarLocalPath = req.files?.avatar[0]?.path
   const coverImageLocalPath = req.files?.coverImage[0]?.path;
   if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required.")
   }

   //STEP5 - If Image Path exists upload the image on Multer 
   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);

   //STEP6 - Create User Entry in DB 
   const user = await User.create({
    fullName,
    avatar:avatar,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })

   //STEP7 - Check if user is created or not and if created remove the refreshToken and password field before sending response
   const createdUser = await User.findById(user._id).select("-password -refreshToken")
   if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering the User.")
   }

   //STEP8 - Sending the Response to Frontend
   return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registered Successfully.")
   )
 
})

export {registerUser};