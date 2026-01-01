import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendTweet } from '@/lib/twitter';

export async function POST(req: NextRequest) {
    // SECURITY NOTE: In a real production app, verify a CRON_SECRET header here.
    // For this prototype, we'll allow it to be triggered publicly or via admin.

    try {
        const now = new Date();

        // 1. Fetch pending tweets that are due
        const pendingTweets = await prisma.tweetQueue.findMany({
            where: {
                status: 'PENDING',
                scheduledFor: { lte: now }
            },
            take: 5 // Process in small batches to avoid timeouts
        });

        if (pendingTweets.length === 0) {
            return NextResponse.json({ success: true, message: 'No tweets to process' });
        }

        const results = [];

        // 2. Process each tweet
        for (const item of pendingTweets) {
            const result = await sendTweet(item.content);

            if (result.success) {
                await prisma.tweetQueue.update({
                    where: { id: item.id },
                    data: {
                        status: 'POSTED',
                        postedAt: new Date()
                    }
                });
                results.push({ id: item.id, status: 'POSTED' });
            } else {
                await prisma.tweetQueue.update({
                    where: { id: item.id },
                    data: {
                        status: 'FAILED',
                        failureReason: JSON.stringify(result.error)
                    }
                });
                results.push({ id: item.id, status: 'FAILED', error: result.error });
            }
        }

        return NextResponse.json({ success: true, processed: results });
    } catch (error) {
        console.error('Queue Processing Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
