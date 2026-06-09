import { NextRequest, NextResponse } from 'next/server';
import { sendTweet } from '@/lib/twitter';
import { checkAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
    try {
        // 1. Admin Guard — require an ADMIN role / allowlisted email, not just login.
        const admin = await checkAdmin();
        if (!admin.ok) {
            return NextResponse.json({ error: admin.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: admin.status });
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
