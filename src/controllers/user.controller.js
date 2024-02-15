import{asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';

const generateAccessAndRefreshToken = async(userId) =>{
   try {
      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()
      //for saving only one entry in db, we use validateBeforeSave
      user.refreshToken = refreshToken
      await user.save({validateBeforeSave : false})

      return {accessToken, refreshToken}
   } catch (error) {
      throw new ApiError("Something went wrong while generating Access Token and Refresh Token");
   }
}


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

   console.log(req.files)
   //STEP4 - Checking for Avatar and CoverImage -  (If correctly stored in local server or not)
   const avatarLocalPath = req.files?.avatar[0]?.path
   console.log(avatarLocalPath)
   
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    //this check is for Cover Image
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

   //this check is for Avatar Image
   if(!avatarLocalPath){
    console.log("LocalPath not found")
    throw new ApiError(400, "Avatar file is required.")
   }

   //STEP5 - If Image Path exists upload the image on Multer 
   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);

   //STEP6 - Create User Entry in DB 
   const user = await User.create({
    fullName,
    avatar:avatar.url,
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

const loginUser = asyncHandler ( async(req,res)=>{
   // request the body data (for all the details)
   // username or email 
   // find the user
   // password check
   // Access and Refresh Token
   // Send Cookie (with response)
   const {email, username, password} = req.body

   if(!username && !email){
      throw new ApiError("Username or Email is required.")
   }

   const user = await User.findOne({
      $or:[{username},{email}]
   })
   if(!user){
      throw new ApiError(404, "User does not exists.")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if(!isPasswordValid){
      throw new ApiError(401, "Invalid User Credentials.")
   }

   const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(new ApiResponse(
      200,
      {
         user: loggedInUser, accessToken, refreshToken
      },
      "User logged in successfully."
   ))
}) 

const logoutUser = asyncHandler (async(req,res)=>{
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined
         }
      },
      {
         new: true
      }
   )
   
   const options = {
      httpOnly: true,
      secure: true
   }

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {}, "User logged out Successfully"))

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken 
   if(!incomingRefreshToken){
      throw new ApiError(401,"Unauthorized Request.");
   }   
   const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
   )

   const user = await User.findById(decodedToken?._id)
   if(!user){
      throw new ApiError(401, "Invalid Refresh Token.")
   }

   if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh Token is expired or used.")
   }

   const options = {
      httpOnly : true,
      secure : true
   }

   const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
      new ApiResponse(
         200,
         {accessToken,refreshToken:newRefreshToken},
         "Access Token Refreshed."
      )
   )

})

export {registerUser, loginUser, logoutUser, refreshAccessToken };