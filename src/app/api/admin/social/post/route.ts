import { NextRequest, NextResponse } from 'next/server';
import { sendTweet } from '@/lib/twitter';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
    try {
        // 1. Admin Guard
        const { userId } = await auth();
        // Ideally check if userId is admin, but for now assuming authenticated user in admin route is sufficient 
        // or relying on middleware protection for /admin routes.
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        const body = await req.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json({ error: 'Tweet text is required' }, { status: 400 });
        }

        // 3. Send Tweet
        const result = await sendTweet(text);

        if (!result.success) {
            // Check for specific error types (e.g., restricted app, invalid keys)
            return NextResponse.json(
                { error: 'Failed to send tweet', details: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
