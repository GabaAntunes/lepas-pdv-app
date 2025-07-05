
'use client';

import { useState, useEffect } from 'react';
import type { ActiveSession } from '@/types';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';

interface ActiveSessionRowProps {
    session: ActiveSession;
}

export function ActiveSessionRow({ session }: ActiveSessionRowProps) {
    const [remainingTimeText, setRemainingTimeText] = useState('...');
    const [isTimeUp, setIsTimeUp] = useState(false);

    useEffect(() => {
        const calculateRemainingTime = () => {
            const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
            const maxTimeInSeconds = session.maxTime * 60;
            let remainingSeconds = maxTimeInSeconds - elapsedSeconds;

            if (remainingSeconds > 0) {
                setIsTimeUp(false);
                const hours = Math.floor(remainingSeconds / 3600);
                const minutes = Math.floor((remainingSeconds % 3600) / 60);
                const seconds = remainingSeconds % 60;
                setRemainingTimeText(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
            } else {
                setIsTimeUp(true);
                setRemainingTimeText(`00:00:00`);
            }
        };

        // Calculate immediately on mount (client-side) to avoid hydration mismatch
        calculateRemainingTime();

        // Update the time every second
        const timer = setInterval(calculateRemainingTime, 1000);
        return () => clearInterval(timer);
    }, [session.startTime, session.maxTime]);

    return (
        <div className={cn(
            "flex items-center py-4 first:pt-0 last:pb-0",
            isTimeUp && "animate-flash-red rounded-lg"
        )}>
            <Avatar className="h-9 w-9 bg-muted">
                <AvatarFallback>{session.responsible.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{session.responsible}</p>
                <p className="text-sm text-muted-foreground">{session.children.length} {session.children.length > 1 ? 'crianças' : 'criança'}</p>
            </div>
            <div className={cn(
                "ml-auto font-mono text-sm font-medium tabular-nums",
                isTimeUp && "text-destructive font-bold"
            )}>
                {remainingTimeText}
            </div>
        </div>
    );
}
