
"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { SaleRecord } from "@/types";
import { getHistoryByCpf } from "@/services/saleHistoryService";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Skeleton } from "../ui/skeleton";
import { CircleDashed, History as HistoryIcon, Tag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface HistoryModalProps {
    responsibleCpf: string | null;
    isOpen: boolean;
    onClose: () => void;
}

function HistorySkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
    )
}

export function HistoryModal({ responsibleCpf, isOpen, onClose }: HistoryModalProps) {
    const { toast } = useToast();
    const [history, setHistory] = useState<SaleRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && responsibleCpf) {
            setLoading(true);
            getHistoryByCpf(responsibleCpf)
                .then(setHistory)
                .catch(() => {
                    toast({
                        variant: "destructive",
                        title: "Erro ao buscar histórico",
                        description: "Não foi possível carregar o histórico do cliente."
                    });
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen, responsibleCpf]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Histórico de Vendas</DialogTitle>
                    <DialogDescription>
                        Vendas finalizadas para o CPF: <span className="font-semibold text-foreground">{responsibleCpf}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto p-1 pr-4">
                    {loading ? (
                       <HistorySkeleton />
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center h-[200px]">
                            <HistoryIcon className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold font-headline">Nenhum Histórico</h3>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Este cliente ainda não possui atendimentos finalizados.
                            </p>
                        </div>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {history.map(sale => (
                                <AccordionItem value={sale.id} key={sale.id}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between w-full pr-2">
                                            <span>{format(new Date(sale.finalizedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                            <span className="font-bold">{formatCurrency(sale.totalAmount)}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-3 text-sm">
                                        <div className="space-y-2 rounded-md border bg-muted/50 p-3">
                                            <p className="font-semibold">Resumo da Venda</p>
                                            <Separator/>
                                            <div className="flex justify-between"><span className="text-muted-foreground">Crianças</span><span>{sale.children.join(', ')}</span></div>
                                            <div className="flex justify-between"><span className="text-muted-foreground">Duração</span><span>{sale.durationInMinutes} min</span></div>
                                            <div className="flex justify-between"><span className="text-muted-foreground">Custo (Tempo)</span><span>{formatCurrency(sale.timeCost)}</span></div>
                                            {sale.children.length > 0 && (
                                                <div className="flex justify-end text-xs text-muted-foreground/80 pt-1 border-t">
                                                    <span>({sale.children.length} {sale.children.length > 1 ? 'crianças' : 'criança'} x {formatCurrency(sale.timeCost / sale.children.length)})</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between"><span className="text-muted-foreground">Custo (Consumo)</span><span>{formatCurrency(sale.consumptionCost)}</span></div>
                                            {sale.discountApplied && sale.discountApplied > 0 && (
                                                <div className="flex justify-between text-green-600">
                                                    <span className="flex items-center gap-1.5"><Tag className="h-4 w-4"/> Cupom ({sale.couponCode})</span>
                                                    <span>- {formatCurrency(sale.discountApplied)}</span>
                                                </div>
                                            )}
                                            <Separator />
                                            <div className="flex justify-between font-bold"><span className="text-muted-foreground">Total Pago</span><span>{formatCurrency(sale.totalAmount)}</span></div>
                                            <div className="flex justify-between"><span className="text-muted-foreground">Pagamento</span><span>{sale.paymentMethods.map(p => p.method).join(' + ')}</span></div>
                                            {sale.changeGiven > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Troco</span><span>{formatCurrency(sale.changeGiven)}</span></div>}
                                        </div>
                                        {sale.consumption.length > 0 && (
                                            <div className="space-y-2 rounded-md border bg-muted/50 p-3">
                                                 <p className="font-semibold">Itens Consumidos</p>
                                                 <Separator/>
                                                {sale.consumption.map(item => (
                                                    <div key={item.productId} className="flex justify-between">
                                                        <span>{item.quantity}x {item.name}</span>
                                                        <span>{formatCurrency(item.price * item.quantity)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
