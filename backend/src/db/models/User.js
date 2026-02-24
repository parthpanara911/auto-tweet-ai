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
    avatarUrl: String,
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
    // workspaceId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Workspace",
    // },
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

// userSchema.index({ workspaceId: 1, isActive: 1 });

export const User = mongoose.model('User', userSchema);