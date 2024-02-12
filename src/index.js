import mongoose from "mongoose";
import dotenv from "dotenv" ;
import connectDB from "./db/index.js";
import {app} from './app.js';

//we want the env file to get executed as soon as we run the program for that we use 'dotenv' package here  
dotenv.config({
    path:'./env'
})


connectDB() //the function comes from db/index.js and is the one that actually connects the database using DB_URI
//the following .then() avails listen from the express app and listens on PORT in the .env file and returns an error if there's an issue 
.then(()=>{
    app.listen(process.env.PORT || 8000 , ()=>{
        console.log(`Server is running at PORT : ${process.env.PORT}`);
    })
}).catch((error)=>{
    console.log(`MongoDB Connection Failed !!`,error);
})