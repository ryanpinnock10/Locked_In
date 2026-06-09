'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
// lucide-react v1 removed the deprecated `Twitter` brand icon; `X` is the
// current rebrand icon. Aliased to TwitterIcon to keep JSX readable.
import { X as TwitterIcon, Send, AlertCircle, CheckCircle2, Clock, Trash2, Play } from 'lucide-react';
import { format } from 'date-fns';

type QueueItem = {
    id: string;
    content: string;
    status: string;
    scheduledFor: string;
    postedAt?: string;
    failureReason?: string;
};

export function SocialManager() {
    const [tweetText, setTweetText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [activeTab, setActiveTab] = useState<'compose' | 'queue'>('compose');

    const charCount = tweetText.length;
    const isOverLimit = charCount > 280;

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        try {
            const res = await fetch('/api/admin/social/queue');
            const data = await res.json();
            if (res.ok) {
                setQueue(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch queue', error);
        }
    };

    const handleTweet = async (action: 'post' | 'queue') => {
        if (!tweetText.trim()) return;

        setIsLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const endpoint = action === 'post' ? '/api/admin/social/post' : '/api/admin/social/queue';

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: tweetText,
                    content: tweetText, // queue api expects 'content'
                    scheduledFor: new Date() // immediate for now
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                const detailMsg = data.details?.data?.detail || data.details?.message || JSON.stringify(data.details);
                throw new Error(detailMsg || data.error || 'Failed');
            }

            setStatus('success');
            setMessage(action === 'post' ? 'Tweet posted!' : 'Added to queue!');
            setTweetText('');
            if (action === 'queue') fetchQueue();
        } catch (error: any) {
            setStatus('error');
            setMessage(error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this tweet from queue?')) return;
        try {
            await fetch(`/api/admin/social/queue?id=${id}`, { method: 'DELETE' });
            fetchQueue();
        } catch (error) {
            console.error(error);
        }
    };

    const handleProcessQueue = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/cron/process-queue', { method: 'POST' });
            const data = await res.json();
            setMessage(`Processed ${data.processed?.length || 0} tweets`);
            fetchQueue();
        } catch (error) {
            setMessage('Failed to process queue');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-zinc-900 border-zinc-800 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <TwitterIcon className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-medium text-white">X / Twitter Manager</h3>
                </div>
                <div className="flex bg-zinc-950 rounded p-1 border border-zinc-800">
                    <button
                        onClick={() => setActiveTab('compose')}
                        className={`text-xs px-3 py-1 rounded ${activeTab === 'compose' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Compose
                    </button>
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`text-xs px-3 py-1 rounded ${activeTab === 'queue' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Queue ({queue.filter(i => i.status === 'PENDING').length})
                    </button>
                </div>
            </div>

            {activeTab === 'compose' && (
                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <textarea
                            className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                            placeholder="What's happening? (Locked In updates, milestones, etc.)"
                            value={tweetText}
                            onChange={(e) => setTweetText(e.target.value)}
                            disabled={isLoading}
                        />
                        <div className={`text-xs text-right mt-1 ${isOverLimit ? 'text-red-500' : 'text-zinc-500'}`}>
                            {charCount}/280
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => handleTweet('queue')}
                            disabled={isLoading || !tweetText.trim() || isOverLimit}
                            className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white py-2 rounded-md font-medium transition-colors text-sm"
                        >
                            <Clock className="w-4 h-4" />
                            Add to Queue
                        </button>
                        <button
                            onClick={() => handleTweet('post')}
                            disabled={isLoading || !tweetText.trim() || isOverLimit}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-md font-medium transition-colors text-sm"
                        >
                            {isLoading ? <span className="animate-spin">⏳</span> : <Send className="w-4 h-4" />}
                            Post Now
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'queue' && (
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleProcessQueue}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 rounded-md font-medium transition-colors text-sm mb-2"
                    >
                        <Play className="w-4 h-4" />
                        Run Automation Now
                    </button>

                    <div className="h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {queue.length === 0 && <p className="text-zinc-500 text-center text-sm py-8">Queue is empty</p>}
                        {queue.map(item => (
                            <div key={item.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded flex justify-between items-start group">
                                <div className="flex flex-col gap-1 w-full">
                                    <p className="text-zinc-300 text-sm break-words pr-2">{item.content}</p>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={`px-1.5 py-0.5 rounded ${item.status === 'POSTED' ? 'bg-green-500/20 text-green-400' :
                                                item.status === 'FAILED' ? 'bg-red-500/20 text-red-500' :
                                                    'bg-yellow-500/10 text-yellow-500'
                                            }`}>
                                            {item.status}
                                        </span>
                                        <span className="text-zinc-600">
                                            {format(new Date(item.scheduledFor), 'MMM d, h:mm a')}
                                        </span>
                                    </div>
                                    {item.failureReason && (
                                        <p className="text-red-500 text-xs mt-1 bg-red-950/30 p-1 rounded">{item.failureReason}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {status === 'success' && message && (
                <div className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 p-2 rounded">
                    <CheckCircle2 className="w-4 h-4" />
                    {message}
                </div>
            )}

            {status === 'error' && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-2 rounded">
                    <AlertCircle className="w-4 h-4" />
                    {message}
                </div>
            )}
        </Card>
    );
}
