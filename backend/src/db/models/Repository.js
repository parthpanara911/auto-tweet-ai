import mongoose from "mongoose";

const repositorySchema = new mongoose.Schema({
    githubId: {
        type: Number,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    description: String,
    url: String,
    language: String,
    isPrivate: Boolean,
    stars: Number,
    lastSyncedAt: Date,
    isTracking: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true }
);

repositorySchema.index({ userId: 1, isTracking: 1 });
repositorySchema.index({ githubId: 1, userId: 1 }, { unique: true });
repositorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Repository', repositorySchema);