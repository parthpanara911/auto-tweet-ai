import crypto from "crypto";
import AppError from "../errors/AppError.js"

class WebhookSignatureService {
    /**
     * Verify GitHub webhook signature
     * GitHub sends: X-Hub-Signature-256: sha256=<hash> 
    **/
    static verifySignature(payload, signature, secret) {
        if (!signature || !secret) {
            throw new AppError(
                'Missing signature or secret for webhook verification',
                401,
                'SIGNATURE_MISSING'
            );
        }

        if (!payload) {
            throw new AppError(
                'Missing payload for webhook verification',
                401,
                'PAYLOAD_MISSING'
            );
        }

        const [algorithm, providedHash] = signature.split('=');

        if (algorithm !== 'sha256' || !providedHash) {
            throw new AppError(
                'Invalid signature format',
                401,
                'INVALID_SIGNATURE_FORMAT'
            );
        }

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(payload);

        const computedHash = hmac.digest('hex');
        try {
            if (providedHash.length !== computedHash.length) {
                return false;
            }
            return crypto.timingSafeEqual(
                Buffer.from(providedHash, 'hex'),
                Buffer.from(computedHash, 'hex')
            );
        } catch (error) {
            throw new AppError(
                'Webhook signature verification failed',
                401,
                'INVALID_SIGNATURE'
            );
        }
    }

    static getDeliveryId(headers) {
        return headers['x-github-delivery'] || null;
    }

    static getEventType(headers) {
        return headers['x-github-event'] || null;
    }

    static getWebhookId(headers) {
        return headers['x-github-hook-id'] || null;
    }
    static getDeliveryAttempt(headers) {
        return parseInt(headers['x-github-delivery-attempt'] || '1', 10);
    }
}

export default WebhookSignatureService;