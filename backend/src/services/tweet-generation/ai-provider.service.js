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
        const { commits, metadata = {}, tech = {} } = commitContext;

        const commitsSummary = commits
            .map((commit) => {
                const msg = this._sanitizeText(commit.message);
                const scale = (commit.additions || 0) + (commit.deletions || 0);
                const files = (commit.files || []).slice(0, 4).join(', ');
                const scaleHint =
                    scale > 300 ? 'large change' :
                        scale > 80 ? 'medium change' :
                            scale > 0 ? 'small change' : '';

                const parts = [`- ${msg}`];
                if (files) parts.push(`  files: ${files}`);
                if (scaleHint) parts.push(`  size: ${scaleHint} (+${commit.additions || 0}/-${commit.deletions || 0} lines)`);
                return parts.join('\n');
            })
            .join('\n');

        const techHint = [
            ...(tech.languages || []),
            ...(tech.frameworks || []),
        ].slice(0, 3).join(', ');

        // Randomize tweet opening style so tweets don't feel repetitive
        const openingPatterns = [
            'Start mid-thought, as if continuing a conversation.',
            'Open with the specific thing you changed, not why.',
            'Open with what broke, then what you did about it.',
            'Lead with the outcome, not the action.',
            'Start with a short clause that sets the problem, then the fix.',
        ];
        const chosenPattern = openingPatterns[Math.floor(Math.random() * openingPatterns.length)];

        // example tweets to teach the AI, These are references for tone only, not templates to copy
        const voiceExamples = [
            'spent way too long on this auth redirect bug. turned out to be a missing await. classic.',
            'rewrote the file upload handler from scratch. old one was doing 3 round trips for no reason.',
            'dark mode is finally not broken on mobile. CSS specificity was the culprit, obviously.',
            'pulled pagination out of the component and into a hook. should have done this months ago.',
            'rate limiting is in. took longer to test edge cases than to write the actual middleware.',
        ].sort(() => Math.random() - 0.5).slice(0, 2).join('\n- ');

        const prompt = `You are a developer who tweets casually about the code you ship. \
You write like a real person: lowercase is fine, sentences can be blunt or incomplete, \
you reference the actual work without overselling it.

Here is your recent work:
${commitsSummary}
${techHint ? `Tech involded: ${techHint}` : ''}

Write one tweet about this work. ${chosenPattern}

Your voice sounds like these examples (do not copy them, only match the register):
- ${voiceExamples}

The tweet must:
- Be under 280 characters
- Mention something specific from the commits above (a file, a behaviour, a bug, a decision)
- Sound like you wrote it in 20 seconds, not like a product announcement
- Use no emojis, no links, no hashtags unless one fits without forcing it (max 1)
- Not start with "just", "finally", "shipped", or "excited"

Reply with the tweet text only. Nothing else.`;

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

        return !invalidPatterns.some((pattern) => pattern.test(text));
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