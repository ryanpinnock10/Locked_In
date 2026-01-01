import { TwitterApi } from 'twitter-api-v2';

// NOTE: These keys must be added to .env.local
// TWITTER_API_KEY
// TWITTER_API_SECRET
// TWITTER_ACCESS_TOKEN
// TWITTER_ACCESS_SECRET

const getTwitterClient = () => {
    return new TwitterApi({
        appKey: process.env.TWITTER_API_KEY || '',
        appSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
    });
};

export async function sendTweet(text: string) {
    try {
        const client = getTwitterClient();
        const twitterClient = client.readWrite;
        const tweet = await twitterClient.v2.tweet(text);
        return { success: true, data: tweet };
    } catch (error: any) {
        console.error('Twitter API Error Structure:', JSON.stringify(error, null, 2));
        // Extract useful info if it's a TwitterApiError
        const errorDetails = error.data || error.message || error;
        return { success: false, error: errorDetails };
    }
}
