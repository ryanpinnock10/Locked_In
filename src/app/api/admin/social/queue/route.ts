import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// Force IDE refresh
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const queue = await prisma.tweetQueue.findMany({
            orderBy: { scheduledFor: 'asc' }
        });

        return NextResponse.json({ success: true, data: queue });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { content, scheduledFor } = await req.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const newItem = await prisma.tweetQueue.create({
            data: {
                content,
                scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
                status: 'PENDING'
            }
        });

        return NextResponse.json({ success: true, data: newItem });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add to queue' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await prisma.tweetQueue.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}
