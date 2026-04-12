import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/environment.js";
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
        const { commits, userStyle = 'professional' } = commitContext;

        const commitsSummary = commits.map((commit, index) => {
            return `${index + 1}. Message: "${this._sanitizeText(commit.message)}"
            Files: ${commit.files && commit.files.length > 0 ?
                    commit.files.slice(0, 3).join(', ') : 'various files'}
                    Changes: +${commit.additions || 0} lines, -${commit.deletions || 0} lines`;
        }).join('\n\n');

        const styleGuide = {
            professional:
                'professional but friendly tone, suitable for a developer audience',
            technical: 'technical and detailed, highlight specific improvements',
            casual: 'casual and fun, use conversational language',
            motivational:
                'motivational and inspiring, emphasize progress and achievements',
        };

        const selectedStyle = styleGuide[userStyle] || styleGuide.professional;

        const prompt = `You are a helpful assistant that generates engaging tweets about software commits.

COMMITS TO SUMMARIZE:
${commitsSummary}

TASK:
Create ONE engaging tweet (maximum 280 characters) that:
- Summarizes what was accomplished across these commits
- Uses a ${selectedStyle}
- Includes relevant hashtags like #dev, #coding, #opensource if appropriate
- Is NOT spam or misleading
- Does NOT include emojis

CONSTRAINTS:
- Maximum 280 characters (STRICT - count every character including spaces and hashtags)
- No spam, no misleading claims
- No emojis
- No links
- Professional quality only

Generate ONLY the tweet text, nothing else. Do not include explanations or quotation marks.`;

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