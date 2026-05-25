import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../../config/environment.js";
import AppError from "../../errors/AppError.js";

class AIProviderService {
    constructor() {
        const apiKey = config.GEMINI_API_KEY;
        if (!apiKey) {
            throw new AppError('Gemini API key is required', 400, 'MISSING_API_KEY');
        }

        this.client = new GoogleGenerativeAI(apiKey);
        this.model = 'gemini-2.5-flash-lite';
    }

    async generateTweet(commitContext) {
        try {
            const prompt = this._buildPrompt(commitContext);
            const model = this.client.getGenerativeModel({ model: this.model });
            const result = await model.generateContent({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
            });

            const tweetText = result.response.text().trim();

            if (!this._validateResponse(tweetText)) {
                console.warn('Gemini response validation failed:', {
                    tweetLength: tweetText.length,
                    commitCount: commitContext.commits.length,
                });
                return null;
            }

            const finalTweet = this._truncateToTwitterLimit(tweetText);
            console.log('Tweet generated successfully from Gemini', {
                commitCount: commitContext.commits.length,
                tweetLength: finalTweet.length,
            });

            return {
                content: finalTweet,
                tokensUsed: result.response.usageMetadata?.totalTokenCount || 0,
            };
        } catch (error) {
            if (error.message?.includes('429') ||
                error.message?.toLowerCase().includes('rate limit')) {
                console.warn('Gemini API rate limited');
                throw new AppError(
                    'AI service rate limit exceeded',
                    429,
                    'AI_RATE_LIMIT'
                );
            }

            console.error('Gemini API error', {
                error: error.message,
            });

            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                'Failed to generate tweet',
                500,
                'AI_GENERATION_FAILED'
            );
        }
    }

    _buildPrompt(commitContext) {
        const { commits, tech = {} } = commitContext;

        const commitsSummary = commits.map((commit) => {
            const msg = this._sanitizeText(commit.message);
            const fileList = commit.files && commit.files.length > 0
                ? commit.files.slice(0, 3).join(', ')
                : null;
            const stats = (commit.additions || 0) + (commit.deletions || 0);

            let line = `- "${msg}"`;
            if (fileList) line += ` (${fileList})`;
            if (stats > 0) line += ` [${stats} lines changed]`;
            return line;
        }).join('\n');

        const techHint = [
            ...(tech.frameworks || []),
            ...(tech.languages || []),
        ].slice(0, 3).join(', ');

        const techLine = techHint
            ? `Stack involved: ${techHint}`
            : '';

        const prompt = `You are a developer writing a casual update tweet about your own code progress. You are NOT a marketing bot or an AI assistant.

COMMITS YOU SHIPPED TODAY:
${commitsSummary}
${techLine ? `\n${techLine}` : ''}

WRITE ONE TWEET that:
- Reads like a realistic developer update, not a creative writing exercise
- Prefer simple and direct wording over clever or dramatic phrasing
- Sound like an engineer posting a quick progress update after coding
- Keep the tone grounded, technical, and natural
- Focuses on WHAT changed and WHY it matters — not on how great it is
- Uses plain, direct language — the way a developer actually talks
- Varies sentence structure naturally (not every tweet should start the same way)
- May include ONE relevant hashtag at the end if it genuinely fits (e.g. #buildinpublic, #webdev, #opensource) — skip it if it would feel forced
- Stays under 280 characters (count every character including spaces)

AVOID ALL OF THESE — they make tweets sound AI-generated:
- Hype openers: "Exciting update!", "Thrilled to share", "Big news", "Proud to announce"
- Filler endings: "Stay tuned!", "More to come!", "The journey continues"
- Marketing tone: "seamless experience", "next-level", "game-changing", "robust solution"
- Forced humor or quirky storytelling
- Overly clever phrasing like "wrestled into existence", "finally tamed", "battle-tested", etc.
- Fake relatable developer jokes
- Generic motivational lines about grinding, hustle, or the dev journey
- Stacking 3+ hashtags
- Emojis
- Links

GOOD TWEET EXAMPLES (style reference only — do NOT copy these):
- "Finally fixed that race condition in the auth flow. Took longer than it should have but the token refresh is solid now."
- "Refactored the webhook handler — cut about 80 lines and made it actually testable. Small win."
- "Spent the morning wiring up the commit processor to the tweet queue. End-to-end works locally, shipping it."
- "Added dark mode. Turns out CSS variables make this way less painful than I expected."

OUTPUT RULES:
- Return ONLY the tweet text
- No quotes around it
- No explanation before or after
- No label like "Tweet:" at the start`;

        return prompt;
    }

    _sanitizeText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            .replace(/[<>]/g, '')
            .replace(/--/g, '-')
            .substring(0, 100)
            .trim();
    }

    _validateResponse(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }

        if (text.length === 0 || text.length > 300) {
            return false;
        }

        // Check for common invalid patterns
        const invalidPatterns = [
            /^null$/i,
            /^undefined$/i,
            /^error/i,
            /^sorry/i,
            /i cannot/i,
            /i am unable/i,
        ];

        for (const pattern of invalidPatterns) {
            if (pattern.test(text)) {
                return false;
            }
        }
        return true;
    }

    _truncateToTwitterLimit(text, limit = 280) {
        if (text.length <= limit) {
            return text;
        }

        let truncated = text.substring(0, limit - 3);

        // Don't cut in the middle of a word
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > limit - 50) {
            truncated = truncated.substring(0, lastSpace);
        }

        return truncated.trim() + '...';
    }
}

export default AIProviderService;