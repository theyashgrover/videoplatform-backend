import{asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import mongoose from "mongoose";

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

const changeCurrentPassword = asyncHandler(async(req,res)=>{

   const {oldPassword, newPassword} = req.body //extracting the old password and new password user just sent
   const user = await User.findById(req.user?._id) //finding user instance by taking user id from the request user just made
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
   if(!isPasswordCorrect){
      throw new ApiError(400, "Invalid Old Password")
   }
   user.password = newPassword
   await user.save({validateBeforeSave: false})

   return res
   .status(200)
   .json(new ApiResponse(200,{},"Password Changed Successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
   return res
   .status(200)
   .json(
      new ApiResponse(200, req.user, "Current user fetched successfully.")
   ) //directly returning res cuz middleware already current user laake dedega
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
   const {fullName,email} = req.body

   if(!fullName && !email){
      throw new ApiError(400, "All fields are required")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            fullName,email
         }
      },
      {new:true}
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200, user, "Account Details Updated Successfully"))
}) 

//similarly we can make one for updating cover image (not making rn cuz it doesen't makes sense to make it)
//but we will have to make a utility function of deleting the avatar image before uploading a new one in this function (basically unlinksync krna hoga util function m)
const updateUserAvatar = asyncHandler(async(req,res)=>{
   const avatarLocalPath = req.file?.path

   if(!avatarLocalPath){
      throw new ApiError(400, "Avatar file is missing")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)

   if(!avatar.url){
      throw new ApiError(400, "Error while uploading Avatar")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            avatar: avatar.url
         }
      },
      {new:true}
   ).select("-password")

   return res
   .status(200)
   .json(
      new ApiResponse(200, user, "Avatar image updated successfully")
   )
})


//the following function is very crucial for the channel profile , as it returns user's channel profile
const getUserChannelProfile = asyncHandler(async(req,res)=>{
   const {username} = req.params
   if(!username?.trim()){
      throw new ApiError(400,"Username is missing.")
   }

   const channel = await User.aggregate(
      [
         {
            $match: {
               username : username?.toLowerCase()
            }
         },
         {
            $lookup: {
               from: "subscriptions",
               localField: "_id",
               foreignField: "channel",
               as: "subscribers"
            }
         },
         {
            $lookup: {
               from: "subscriptions",
               localField: "_id",
               foreignField: "subscriber",
               as: "subscribedTo"
            }
         },
         {
            $addFields: {
               subscribersCount:{
                  $size: "$subscribers"
               },
               channelsSubscribedToCount:{
                  $size: "$subscribedTo"
               },
               isSubscribed: {
                  $cond: {
                     if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                     then: true,
                     else:false
                  }
               }
            }
         },
         {
            $project: {
               fullName: 1,
               username: 1,
               subscribersCount: 1,
               channelsSubscribedToCount: 1,
               isSubscribed: 1,
               avatar: 1,
               coverImage: 1,
               email: 1
            }
         }
      ]
   )

   if(!channel?.length){
      throw new ApiError(404, "Channel does not exists.")
   }

   return res
   .status(200)
   .json(new ApiResponse(200, channel[0], "User Channel fetched successfully."))
})

const getWatchHistory = asyncHandler(async(req,res)=>{
   const user = await User.aggregate([
      {
         $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)
         }
      },
      {
         $lookup:{
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline:[
               {
                  $lookup: {
                     from: "users",
                     localField: "owner",
                     foreignField: "_id",
                     as: "owner",
                     pipeline:[
                        {
                           $project: {
                              fullName: 1,
                              username: 1,
                              avatar: 1
                           }
                        }
                     ]
                  }
               },
               {
                  $addFields:{
                     owner:{
                        $first: "$owner"
                     }
                  }
               }
            ]
         }
      }
   ])

   return res
   .status(200)
   .json(
      new ApiResponse(200, user[0].watchHistory, "WatchHistory fetched successfully." )
   )

})


export {getWatchHistory, registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, getUserChannelProfile };