import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

//post mein route ke according controller call krne se pehle we are calling middleware , cuz middleware says 
// - "jaane se pehle mujhse milke jana xD"
router.route("/register").post(
    //there are a lot of methods we can call using the upload function from multer but yha pe humey
    //different different fields se uploads lene h isliye using fields here 

    upload.fields(
        [
            {
                name: "avatar",
                maxCount:1
            },
            {
                name:"coverImage",
                maxCount:1
            }
        ]
    ),
    registerUser)

router.route("/login").post(loginUser)

//secured routes - jo ki login ke baad hee access hoskte hai : 
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

    
export default router;