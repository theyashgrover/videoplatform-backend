import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt';

const userSchema = new Schema(
    {
    username : {
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email : {
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullName : {
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar : {
        type:String,//cloudinary url
        required:true,
    },
    coverImage : {
        type:String//cloudinary url
    },
    watchHistory : [{
        type: Schema.Types.ObjectId,
        ref: "Video",
    }],
    password : {
        type:String,
        required:[true,"Correct Password is Required"]
    },
    refreshToken :{
        type:String
    }
    },
  {
    timestamps:true
  }
)

//for saving passwords as hash and matching them with the user input 
//(as well as making sure hashing occurs only when there is a change in password field) 
userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
} 

//generating access token using JWT
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

//generating refresh token using JWT
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User",userSchema);