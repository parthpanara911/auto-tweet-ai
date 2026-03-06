import mongoose from "mongoose";

const webhookSchema = new mongoose.Schema({
    githubId: {
        type: Number,
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
    secret: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    lastDeliveryAt: Date,
    failureCount: {
        type: Number,
        default: 0,
    },
    url: String,
}, {
    timestamps: true,
    collection: 'webhooks',
});

webhookSchema.index({ userId: 1, isActive: 1 });
webhookSchema.index({ repositoryId: 1 });

export default mongoose.model('Webhook', webhookSchema);