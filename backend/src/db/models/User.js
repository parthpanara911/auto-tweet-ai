import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    githubId: {
        type: String,
        required: true,
        unique: true,
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        sparse: true
    },
    avatar: String,
    profileUrl: String,
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    authProvider: {
        type: String,
        enum: ["github"],
        default: "github",
    },
    githubAccessToken: {
        type: String,
        required: false,
    },
    githubTokenEncrypted: {
        type: Boolean,
        default: false,
    },
    githubTokenRevoked: {
        type: Boolean,
        default: false,
        index: true
    },
    tokenRevokedAt: Date,
    lastLoginAt: {
        type: Date,
        default: Date.now,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    deletedAt: Date,
}, { timestamps: true });

export default mongoose.model('User', userSchema);