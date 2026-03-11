import dotenv from "dotenv";

dotenv.config();

const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000,

    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/autotweetai',

    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,

    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

    REDIS_URL: process.env.REDIS_URL,

    WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL || 'http://localhost:5000',
    WEBHOOK_TIMEOUT: process.env.WEBHOOK_TIMEOUT || 30000,
};

export default config;