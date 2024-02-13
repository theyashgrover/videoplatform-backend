import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";

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

export default router;