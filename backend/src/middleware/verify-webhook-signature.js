import WebhookEventLog from "../db/models/WebhookEventLog.js";
import Webhook from "../db/models/Webhook.js";
import { decrypt } from "../utils/encryption.js";
import WebhookSignatureService from "../services/webhook-signature.service.js";
import AppError from "../errors/AppError.js";

async function verifyWebhookSignature(req, res, next) {
    try {
        const { webhookId } = req.params;
        const signature = req.headers['x-hub-signature-256'];
        const deliveryId = req.headers['x-github-delivery-uuid'];
        const eventType = req.headers['x-github-event'];

        let payload = req.body;
        if (Buffer.isBuffer(payload)) {
            payload = payload.toString('utf-8');
        }
        console.log(
            `Webhook received: webhookId=${webhookId}, deliveryID=${deliveryId}, event=${eventType}`
        );

        if (!signature) {
            console.warn('[Webhook] Missing X-Hub-Signature-256 header');

            if (webhookId) {
                await WebhookEventLog.create({
                    webhookId: null,
                    githubDeliveryId: deliveryId,
                    payload: {},
                    signatureValid: false,
                    status: 'received',
                    errorMessage: 'Missing signature header'
                }).catch((err) => {
                    console.error('Failed to log webhook event:', err.message);
                });
            }

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

        // ======= Load webhook from db =======
        const webhook = await Webhook.findById(webhookId);

        if (!webhook) {
            console.warn(`Webhook not found: ${webhookId}`);

            await WebhookEventLog.create({
                webhookId: null,
                githubDeliveryId: deliveryId,
                signatureValid: false,
                status: 'received',
                errorMessage: 'Webhook not found'
            }).catch((err) => {
                console.error('Failed to log webhook event:', err.message);
            });

            throw new AppError(
                'Webhook not found',
                404,
                'WEBHOOK_NOT_FOUND'
            );
        }

        if (!webhook.isActive) {
            console.warn(`Webhook is inactive: ${webhookId}`);

            await WebhookEventLog.create({
                webhookId: webhook._id,
                githubDeliveryId: deliveryId,
                signatureValid: false,
                status: 'received',
                errorMessage: 'Webhook is inactive'
            }).catch((err) => {
                console.error('Failed to log webhook event:', err.message);
            });

            throw new AppError(
                'Webhook is inactive',
                404,
                'WEBHOOK_INACTIVE'
            );
        }

        // ======= Decrypt webhook secret =======
        let decryptedSecret;
        try {
            decryptedSecret = decrypt(webhook.secret);
        } catch (error) {
            console.error(`[Webhook] Failed to decrypt secret: ${error.message}`);

            throw new AppError(
                'Failed to decrypt webhook secret',
                500,
                'DECRYPTION_ERROR'
            );
        }

        // ======= Verify signature =======
        let isSignatureValid = false;
        let signatureError = null;

        try {
            isSignatureValid = WebhookSignatureService.verifySignature(payload, signature, decryptedSecret);
            console.log(`[Webhook] Signature verified successfully: ${webhookId}`);
        } catch (error) {
            signatureError = error;
            console.warn(`[Webhook] Signature verification failed: ${error.message}`);

            await WebhookEventLog.create({
                webhookId: webhook._id,
                githubDeliveryId: deliveryId,
                signatureValid: false,
                status: 'received',
                errorMessage: error.message
            }).catch((err) => {
                console.error('Failed to log webhook event:', err.message);
            });

            throw new AppError(
                'Invalid webhook signature',
                401,
                'INVALID_SIGNATURE'
            );
        }

        // ======= Attach to request =======
        req.webhook = webhook;
        req.deliveryId = deliveryId;
        req.eventType = eventType;

        // ======= Parse payload =======
        try {
            req.payload = JSON.parse(payload);
        } catch (error) {
            console.error(`[Webhook] Failed to parse payload: ${error.message}`);

            throw new AppError(
                'Invalid JSON payload',
                400,
                'INVALID_JSON'
            );
        }

        // ================================================== 
        next();
    } catch (error) {
        if (!(error instanceof AppError)) {
            console.error(
                '[Webhook] Unexpected error in signature verification:', error
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