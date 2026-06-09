import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendTweet } from '@/lib/twitter';

export async function POST(req: NextRequest) {
    // SECURITY: this endpoint flushes and posts the social queue, so it must not
    // be publicly triggerable. Require a shared secret. Vercel Cron sends this as
    // `Authorization: Bearer ${CRON_SECRET}`; a manual admin trigger can use the
    // same header. If CRON_SECRET is unset we fail closed (deny) rather than open.
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get("authorization")
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
