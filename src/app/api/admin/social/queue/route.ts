import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdmin } from '@/lib/admin-auth';

// Force IDE refresh
export async function GET(req: NextRequest) {
    try {
        const admin = await checkAdmin();
        if (!admin.ok) return NextResponse.json({ error: admin.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: admin.status });

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
        const admin = await checkAdmin();
        if (!admin.ok) return NextResponse.json({ error: admin.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: admin.status });

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
        const admin = await checkAdmin();
        if (!admin.ok) return NextResponse.json({ error: admin.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: admin.status });

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
