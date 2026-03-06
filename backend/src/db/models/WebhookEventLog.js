import mongoose from "mongoose";

const webhookEventLogSchema = new mongoose.Schema({
    webhookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Webhook',
        required: true,
        index: true,
    },
    githubDeliveryId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    // Payload
    payload: mongoose.Schema.Types.Mixed,

    signatureValid: Boolean,
    isDuplicate: Boolean,
    status: {
        type: String,
        enum: ['received', 'queued', 'processing', 'completed', 'failed'],
        index: true,
    },
    errorMessage: String,
    processingTime: Number,
}, {
    timestamps: true,
    collection: 'webhook_event_logs',
    ttl: 604800,
}
);

webhookEventLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

export default mongoose.model('WebhookEventLog', webhookEventLogSchema);