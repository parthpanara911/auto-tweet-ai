import mongoose from "mongoose";
import AppError from "../errors/AppError.js";

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected...");
    } catch (error) {
        throw new AppError('DB connection failed', 500, 'DB_CONNECTION_ERROR');
    }
}

export default connectDB;