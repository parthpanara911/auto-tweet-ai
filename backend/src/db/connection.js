import mongoose from "mongoose";
import config from "../config/environment.js";
import AppError from "../errors/AppError.js";

async function connectDB() {
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log("MongoDB connected...");
    } catch (error) {
        throw new AppError('DB connection failed', 500, 'DB_CONNECTION_ERROR');
    }
}

export default connectDB;