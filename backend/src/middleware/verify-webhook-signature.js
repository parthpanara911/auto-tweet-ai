import WebhookEventLog from "../db/models/WebhookEventLog.js";
import Webhook from "../db/models/Webhook.js";
import { decrypt } from "../utils/encryption.js";
import WebhookSignatureService from "../services/webhook-signature.service.js";
import AppError from "../errors/AppError.js";

async function verifyWebhookSignature(req, res, next) {
    try {
        const signature = req.headers['x-hub-signature-256'];
        const deliveryId = req.headers['x-github-delivery'];
        const eventType = req.headers['x-github-event'];
        const githubHookId = Number(req.headers['x-github-hook-id']);

        if (!signature) {
            throw new AppError(
                'Missing webhook signature',
                400,
                'MISSING_SIGNATURE'
            );
        }

        if (!deliveryId) {
            throw new AppError(
                'Missing delivery ID',
                400,
                'MISSING_DELIVERY_ID'
            );
        }

        if (!githubHookId || Number.isNaN(githubHookId)) {
            throw new AppError(
                'Missing or invalid GitHub hook ID',
                400,
                'MISSING_HOOK_ID'
            );
        }

        if (!req.rawBody) {
            throw new AppError('Raw body missing', 500, 'MISSING_RAW_BODY');
        }

        // ======= Load webhook from db =======
        const webhook = await Webhook.findOne({
            githubId: githubHookId,
            isActive: true
        }).select('+secret');

        if (!webhook) {
            console.warn(`[Webhook] No webhook found for GitHub ID: ${githubHookId}`);
            throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
        }

        if (!webhook.secret) {
            throw new AppError(
                'Webhook secret not found',
                500,
                'SECRET_MISSING'
            );
        }

        const secret = decrypt(webhook.secret);

        const isValid = WebhookSignatureService.verifySignature(
            req.rawBody,
            signature,
            secret
        );

        if (!isValid) {
            throw new AppError('Invalid signature', 401, 'INVALID_SIGNATURE');
        }

        console.log(`[Webhook] Signature verified for webhook ${webhook._id}`);

        // ======= Attach to request =======
        req.webhook = webhook;
        req.deliveryId = deliveryId;
        req.eventType = eventType;
        req.payload = JSON.parse(req.rawBody.toString('utf-8'));

        next();
    } catch (error) {
        if (!(error instanceof AppError)) {
            console.error(
                '[Webhook] Unexpected error:', error
            );
            error = new AppError(
                'Webhook verification failed',
                500,
                'VERIFICATION_ERROR'
            );
        }

        next(error);
    }
}

export default verifyWebhookSignature;