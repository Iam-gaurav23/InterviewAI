import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/connectDb.js"
import cookieParser from "cookie-parser"
dotenv.config()
import cors from "cors"
import authRouter from "./routes/auth.route.js"
import userRouter from "./routes/user.route.js"
import interviewRouter from "./routes/interview.route.js"
import paymentRouter from "./routes/payment.route.js"

const app = express()
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server and local tools with no Origin header.
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
            return callback(null, true)
        }
        return callback(new Error("Origin not allowed by CORS"))
    },
    credentials: true
}))

app.use(express.json())
app.use(cookieParser())

app.use("/api/auth" , authRouter)
app.use("/api/user", userRouter)
app.use("/api/interview" , interviewRouter)
app.use("/api/payment" , paymentRouter)

const PORT = process.env.PORT || 6000
app.listen(PORT , ()=>{
    console.log(`Server running on port ${PORT}`)
    connectDb()
})
