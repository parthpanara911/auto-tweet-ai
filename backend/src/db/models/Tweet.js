import mongoose from "mongoose";

const tweetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        commitIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Commit',
            index: true
        }],
        content: {
            type: String,
            required: true,
            maxLength: 280,
            trim: true,
        },
        editedContent: {
            type: String,
            maxlength: 280,
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['draft', 'approved', 'posted', 'rejected'],
            default: 'draft',
        },
        metadata: {
            commitCount: Number,
            mainLanguages: {
                type: [String],
                default: [],
            },
        },
        twitterMetadata: {
            tweetId: String,
            url: String,
        },
        generatedAt: Date,
        postedAt: Date,
    },
    {
        timestamps: true,
    }
);

tweetSchema.index({ userId: 1, status: 1, createdAt: -1 });
tweetSchema.index({ status: 1 });
tweetSchema.index({ generatedAt: -1 });

export default mongoose.model('Tweet', tweetSchema);