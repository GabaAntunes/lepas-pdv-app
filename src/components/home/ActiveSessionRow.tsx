
'use client';

import { useState, useEffect } from 'react';
import type { ActiveSession } from '@/types';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface ActiveSessionRowProps {
    session: ActiveSession;
}

export function ActiveSessionRow({ session }: ActiveSessionRowProps) {
    const [timerState, setTimerState] = useState({
        remainingTimeText: '...:..:..',
        isTimeUp: false,
        progress: 100,
        statusColor: 'text-green-600',
        progressColor: 'bg-green-500',
        Icon: CheckCircle
    });

    useEffect(() => {
        const calculateState = () => {
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - session.startTime) / 1000);
            const maxTimeInSeconds = session.maxTime * 60;
            const remainingSeconds = Math.max(0, maxTimeInSeconds - elapsedSeconds);
            const isTimeUp = remainingSeconds <= 0;
            const progress = (remainingSeconds / maxTimeInSeconds) * 100;
            
            const hours = Math.floor(remainingSeconds / 3600);
            const minutes = Math.floor((remainingSeconds % 3600) / 60);
            const seconds = remainingSeconds % 60;
            const remainingTimeText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            let statusColor = 'text-green-600';
            let progressColor = 'bg-green-500';
            let Icon = CheckCircle;

            if (isTimeUp) {
                statusColor = 'text-destructive';
                progressColor = 'bg-destructive';
                Icon = AlertTriangle;
            } else if (progress < 20) {
                statusColor = 'text-destructive';
                progressColor = 'bg-destructive';
                Icon = AlertTriangle;
            } else if (progress < 50) {
                statusColor = 'text-orange-500';
                progressColor = 'bg-orange-500';
                Icon = AlertTriangle;
            }

            setTimerState({
                remainingTimeText,
                isTimeUp,
                progress,
                statusColor,
                progressColor,
                Icon
            });
        };

        calculateState();
        const timer = setInterval(calculateState, 1000);
        return () => clearInterval(timer);
    }, [session.startTime, session.maxTime]);

    return (
        <TooltipProvider>
            <div className={cn(
                "flex items-center py-5 gap-4",
                timerState.isTimeUp && "animate-flash-red rounded-lg"
            )}>
                <Avatar className="h-10 w-10 bg-muted">
                    <AvatarFallback>{session.responsible.split(' ').map(n => n[0]).slice(0, 2).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium leading-none truncate">{session.responsible}</p>
                        <div className={cn(
                            "ml-auto font-mono text-sm font-medium tabular-nums flex items-center gap-1.5 shrink-0",
                            timerState.statusColor
                        )}>
                             <timerState.Icon className="h-4 w-4" />
                             {timerState.remainingTimeText}
                        </div>
                    </div>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Progress value={timerState.progress} className="h-1.5" indicatorClassName={timerState.progressColor}/>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-sm text-muted-foreground">Crianças: <span className="font-medium text-foreground">{session.children.join(', ')}</span></p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    );
}
