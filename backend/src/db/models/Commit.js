import mongoose from "mongoose";

const commitSchema = new mongoose.Schema({
    githubSha: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    repositoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Repository',
        required: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    authorName: String,
    authorEmail: String,
    message: String,
    url: String,
    branch: String,
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
    filesChanged: { type: Number, default: 0 },
    timestamp: {
        type: Date,
        required: true,
        index: true,
    },
    webhookReceivedAt: Date,
    processingStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
        index: true,
    },
    isProcessed: {
        type: Boolean,
        default: false,
        index: true,
    },
    metadata: {
        files: [String],
        complexity: { type: String, enum: ['low', 'medium', 'high'] },
        tags: [String],
    },
}, {
    timestamps: true,
    collection: 'commits',
}
);

commitSchema.index({ userId: 1, timestamp: -1 });
commitSchema.index({ repositoryId: 1, timestamp: -1 });
commitSchema.index({ userId: 1, processingStatus: 1 });
commitSchema.index({ repositoryId: 1, isProcessed: 1 });

export default mongoose.model('Commit', commitSchema);