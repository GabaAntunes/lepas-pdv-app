"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { ActiveSession, Settings } from "@/types";
import { Clock, Loader2, ShoppingCart, Tag } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface SummaryModalProps {
    session: ActiveSession | null;
    isOpen: boolean;
    onClose: () => void;
    settings: Settings | null;
}

export function SummaryModal({ session, isOpen, onClose, settings }: SummaryModalProps) {
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [isOpen]);

    const summary = useMemo(() => {
        if (!session || !settings) return null;

        // Elapsed time calculation
        const elapsedSeconds = Math.floor((currentTime - session.startTime) / 1000);
        const elapsedMinutes = Math.max(0, elapsedSeconds / 60);

        // Contracted time
        const contractedMinutes = session.maxTime;

        // Determine the time to charge for (the greater of elapsed or contracted)
        const minutesToCharge = Math.max(elapsedMinutes, contractedMinutes);
        const hoursToCharge = Math.max(1, Math.ceil(minutesToCharge / 60));
        
        // Cost calculation
        const childrenCount = session.children.length;

        // Breakdown cost calculation
        const additionalHours = Math.max(0, hoursToCharge - 1);
        const firstHourTotalCost = settings.firstHourRate * childrenCount;
        const additionalHoursTotalCost = additionalHours * settings.additionalHourRate * childrenCount;
        const timeCost = firstHourTotalCost + additionalHoursTotalCost;
        
        const consumptionCost = session.consumption.reduce((acc, item) => acc + item.price * item.quantity, 0);

        const subtotal = timeCost + consumptionCost;
        const discount = session.discountApplied || 0;
        const total = Math.max(0, subtotal - discount);

        // Formatting for display
        const elapsedH = Math.floor(elapsedSeconds / 3600);
        const elapsedM = Math.floor((elapsedSeconds % 3600) / 60);
        const elapsedS = elapsedSeconds % 60;
        const formattedElapsedTime = [elapsedH, elapsedM, elapsedS].map(v => v.toString().padStart(2, '0')).join(':');

        const contractedH = Math.floor(contractedMinutes / 60);
        const contractedM = contractedMinutes % 60;
        const formattedContractedTime = `${contractedH.toString().padStart(2, '0')}h ${contractedM.toString().padStart(2, '0')}m`;

        return {
            timeCost,
            consumptionCost,
            subtotal,
            discount,
            total,
            childrenCount,
            formattedElapsedTime,
            formattedContractedTime,
            hoursToCharge,
            firstHourTotalCost,
            additionalHours,
            additionalHoursTotalCost,
        };
    }, [session, currentTime, settings]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Resumo do Atendimento</DialogTitle>
                    <DialogDescription>
                        Custo atual para <span className="font-semibold text-foreground">{session?.responsible}</span>.
                    </DialogDescription>
                </DialogHeader>
                
                {!summary ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-4 pt-4">
                        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                            <div className="flex items-center gap-3 mb-2">
                                <Clock className="h-6 w-6 text-primary" />
                                <p className="font-semibold">Custo por Tempo</p>
                                <p className="ml-auto font-mono text-lg font-bold">{formatCurrency(summary.timeCost)}</p>
                            </div>
                            <Separator />
                             <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tempo Contratado</span>
                                    <span className="font-mono">{summary.formattedContractedTime}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tempo Decorrido</span>
                                    <span className="font-mono">{summary.formattedElapsedTime}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                    <span className="text-muted-foreground">Total a Cobrar</span>
                                    <span className="font-mono">{summary.hoursToCharge} {summary.hoursToCharge > 1 ? 'horas' : 'hora'}</span>
                                </div>
                                
                                <div className="space-y-1 rounded-md border bg-background/50 p-2 mt-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Valor 1ª Hora</span>
                                        <span className="font-mono">{formatCurrency(summary.firstHourTotalCost)}</span>
                                    </div>
                                    {summary.additionalHours > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Horas Adicionais ({summary.additionalHours}h)</span>
                                            <span className="font-mono">{formatCurrency(summary.additionalHoursTotalCost)}</span>
                                        </div>
                                    )}
                                    {summary.childrenCount > 1 && (
                                        <div className="flex justify-end text-xs text-muted-foreground/80 pt-1 border-t">
                                            <span>(Base para {summary.childrenCount} crianças)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {session && session.consumption.length > 0 && (
                             <div className="rounded-lg bg-muted/50 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <ShoppingCart className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="font-semibold">Itens Consumidos</p>
                                        <p className="text-sm text-muted-foreground">Custo do consumo</p>
                                    </div>
                                    <p className="ml-auto font-mono text-sm">{formatCurrency(summary.consumptionCost)}</p>
                                </div>
                                <ScrollArea className="h-24 pr-3">
                                <div className="space-y-2 text-sm">
                                    {session.consumption.map(item => (
                                        <div key={item.productId} className="flex justify-between">
                                            <span className="text-muted-foreground">{item.quantity}x {item.name}</span>
                                            <span className="font-mono">{formatCurrency(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>
                                </ScrollArea>
                            </div>
                        )}
                        
                        <Separator />

                        <div className="space-y-2 text-sm">
                           <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-mono">{formatCurrency(summary.subtotal)}</span>
                            </div>
                           {summary.discount > 0 && (
                             <div className="flex justify-between text-green-600">
                                <span className="flex items-center gap-1.5"><Tag className="h-4 w-4"/> Cupom ({session?.couponCode})</span>
                                <span className="font-mono">- {formatCurrency(summary.discount)}</span>
                            </div>
                           )}
                        </div>

                         <Separator />

                        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
                            <p className="text-xl font-bold text-primary">Total a Pagar</p>
                            <p className="font-mono text-3xl font-bold text-primary">{formatCurrency(summary.total)}</p>
                        </div>
                    </div>
                )}
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
