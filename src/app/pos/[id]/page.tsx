
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  CircleDashed,
  CreditCard,
  DollarSign,
  Loader2,
  MinusCircle,
  Palette,
  PartyPopper,
  Receipt,
  ShoppingCart,
  Tag,
  Ticket,
} from 'lucide-react';
import { ActiveSession, Coupon, Payment, Settings } from '@/types';
import { getActiveSessionById } from '@/services/activeSessionService';
import { getSettings } from '@/services/settingsService';
import { useToast } from '@/hooks/use-toast';
import { getCouponByCode } from '@/services/couponService';
import { finalizeSale } from '@/services/saleService';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const formatCurrency = (value: number | undefined | null): string => {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

type PaymentMethodType = 'Dinheiro' | 'PIX' | 'Crédito' | 'Débito';

const paymentMethodOptions: { name: PaymentMethodType, icon: React.ElementType }[] = [
    { name: 'Dinheiro', icon: DollarSign },
    { name: 'PIX', icon: Palette },
    { name: 'Crédito', icon: CreditCard },
    { name: 'Débito', icon: CreditCard },
]

export default function PosPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.id as string;
    const { toast } = useToast();

    const [session, setSession] = useState<ActiveSession | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [payments, setPayments] = useState<Payment[]>([]);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null); // For new coupons applied on this screen
    const [initialCoupon, setInitialCoupon] = useState<Coupon | null>(null); // For the coupon used at session start
    const [isLoadingCoupon, setIsLoadingCoupon] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [focusedPayment, setFocusedPayment] = useState<PaymentMethodType | null>(null);

    useEffect(() => {
      if (!sessionId) return;
      
      const fetchData = async () => {
        setLoading(true);
        try {
          const [sessionData, settingsData] = await Promise.all([
            getActiveSessionById(sessionId),
            getSettings()
          ]);
          
          if (!sessionData) {
            toast({ variant: 'destructive', title: 'Atendimento não encontrado' });
            router.push('/active-children');
            return;
          }

          setSession(sessionData);
          setSettings(settingsData);
          
          // Load initial coupon details for display purposes, if one was used.
          if (sessionData.couponCode) {
            const coupon = await getCouponByCode(sessionData.couponCode);
            if (coupon) {
              setInitialCoupon(coupon);
            }
          }

        } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Erro ao carregar dados' });
          router.push('/active-children');
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
    }, [sessionId, router, toast]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000 * 30); // Update every 30s
        return () => clearInterval(timer);
    }, []);

    const summary = useMemo(() => {
        if (!session || !settings) return null;

        const elapsedSeconds = Math.floor((currentTime - session.startTime) / 1000);
        const elapsedMinutes = Math.max(0, elapsedSeconds / 60);
        const contractedMinutes = session.maxTime;
        const minutesToCharge = Math.max(elapsedMinutes, contractedMinutes);
        const hoursToCharge = Math.max(1, Math.ceil(minutesToCharge / 60));
        
        const childrenCount = session.children.length;
        
        const additionalHours = Math.max(0, hoursToCharge - 1);
        const firstHourTotalCost = settings.firstHourRate * childrenCount;
        const additionalHoursTotalCost = additionalHours * settings.additionalHourRate * childrenCount;
        const timeCost = firstHourTotalCost + additionalHoursTotalCost;
        
        const consumptionCost = session.consumption.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const subtotal = timeCost + consumptionCost;
        
        let discount = 0;
        
        // A new coupon applied on the POS screen takes precedence.
        if (appliedCoupon) {
            if (appliedCoupon.discountType === 'percentage') {
                // POS-screen coupon discount is always on the first hour only
                const firstHourCostForDiscount = settings.firstHourRate * childrenCount;
                discount = firstHourCostForDiscount * (appliedCoupon.discountValue / 100);
            } else if (appliedCoupon.discountType === 'fixed') {
                discount = appliedCoupon.discountValue;
            }
        } 
        // Otherwise, use the discount from when the session was created. This value is 0 after the first payment.
        else if (session.discountApplied) {
            discount = session.discountApplied;
        }

        const totalBeforePayments = Math.max(0, subtotal - discount);
        const alreadyPaid = session.totalPaidSoFar || 0;
        const total = Math.max(0, totalBeforePayments - alreadyPaid);

        return { 
            timeCost, 
            consumptionCost, 
            subtotal, 
            discount,
            alreadyPaid,
            total, 
            durationInMinutes: minutesToCharge,
            childrenCount,
            hoursToCharge,
            firstHourTotalCost,
            additionalHours,
            additionalHoursTotalCost
        };
    }, [session, settings, appliedCoupon, currentTime]);

     const couponDescription = useMemo(() => {
        if (!summary?.discount) return null;

        const couponForDetails = appliedCoupon || initialCoupon;
        const couponCodeToShow = appliedCoupon?.code || session?.couponCode;

        if (!couponCodeToShow) return "Desconto Aplicado";

        if (couponForDetails) {
            if (couponForDetails.discountType === 'percentage') {
                return `Desconto de ${couponForDetails.discountValue}% na 1ª hora (${couponCodeToShow})`;
            }
            if (couponForDetails.discountType === 'fixed') {
                return `Desconto fixo de ${formatCurrency(couponForDetails.discountValue)} (${couponCodeToShow})`;
            }
            if (couponForDetails.discountType === 'freeTime') {
                 return `Desconto por tempo grátis (${couponCodeToShow})`;
            }
        }
        
        return `Cupom (${couponCodeToShow})`;
    }, [appliedCoupon, initialCoupon, session?.couponCode, summary?.discount]);


    const paymentSummary = useMemo(() => {
        const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
        const amountDue = summary ? summary.total - totalPaid : 0;
        
        const cashPayment = payments.find(p => p.method === 'Dinheiro')?.amount || 0;
        const totalPaidWithoutCash = totalPaid - cashPayment;
        const amountDueForCash = (summary?.total || 0) - totalPaidWithoutCash;
        const changeGiven = Math.max(0, cashPayment - amountDueForCash);

        return { totalPaid, amountDue, changeGiven };
    }, [payments, summary]);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsLoadingCoupon(true);
        setAppliedCoupon(null);
        try {
            const coupon = await getCouponByCode(couponCode);
            if (coupon && coupon.status === 'active') {
                if (coupon.discountType === 'freeTime') {
                    toast({ variant: 'destructive', title: "Cupom não aplicável", description: "Cupons de tempo só podem ser usados ao iniciar um novo atendimento." });
                    return;
                }
                setAppliedCoupon(coupon);
                toast({ title: "Cupom aplicado com sucesso!" });
            } else {
                toast({ variant: 'destructive', title: "Cupom inválido ou expirado" });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao aplicar cupom" });
        } finally {
            setIsLoadingCoupon(false);
        }
    };

    const togglePaymentMethod = (method: PaymentMethodType) => {
        setPayments(prev => {
            const isRemoving = prev.some(p => p.method === method);

            if (isRemoving) {
                const updatedPayments = prev.filter(p => p.method !== method);
                // If we go down to a single payment method, auto-fill it with the total.
                if (updatedPayments.length === 1 && summary) {
                    const singlePayment = updatedPayments[0];
                    return [{ ...singlePayment, amount: summary.total }];
                }
                return updatedPayments;
            } else {
                // Adding a new payment method
                const currentTotalPaid = prev.reduce((acc, p) => acc + p.amount, 0);
                const amountDue = summary ? Math.max(0, summary.total - currentTotalPaid) : 0;
                
                const newPayment: Payment = { method, amount: amountDue };

                // If this is the very first payment method, it should take the full total.
                if (prev.length === 0 && summary) {
                    newPayment.amount = summary.total;
                }

                return [...prev, newPayment];
            }
        });
    };

    const updatePaymentAmount = (method: PaymentMethodType, value: string) => {
        const numericAmount = parseFloat(value.replace(',', '.'));
        const amount = isNaN(numericAmount) ? 0 : numericAmount;
        setPayments(prev => prev.map(p => p.method === method ? { ...p, amount } : p));
    };

    const handleConfirmSale = async () => {
      if (!session || !summary || paymentSummary.amountDue > 0.001) return;
      setIsProcessing(true);
      try {
        const elapsedMinutes = Math.floor((Date.now() - session.startTime) / 1000 / 60);
        const isOvertime = elapsedMinutes > session.maxTime;
        const shouldCloseSession = isOvertime;

        const finalCoupon = appliedCoupon ?? (session.couponCode ? await getCouponByCode(session.couponCode) : null);

        await finalizeSale(session, {
          paymentMethods: payments,
          totalAmount: summary.total,
          timeCost: summary.timeCost,
          consumptionCost: summary.consumptionCost,
          durationInMinutes: summary.durationInMinutes,
          changeGiven: paymentSummary.changeGiven,
          couponCode: finalCoupon?.code,
          couponId: finalCoupon?.id,
          discountApplied: summary.discount,
        }, shouldCloseSession);

        if(shouldCloseSession) {
            toast({
              title: "Venda Finalizada com Sucesso!",
              description: `O atendimento de ${session.responsible} foi concluído.`,
              className: "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700"
            });
        } else {
            toast({
              title: "Pagamento recebido!",
              description: "O atendimento continua ativo com o saldo quitado.",
            });
        }
        
        router.push('/active-children');

      } catch (error: any) {
        console.error(error);
        toast({ 
            variant: 'destructive', 
            title: 'Erro ao finalizar venda', 
            description: error.message || 'Ocorreu um erro e a venda não foi concluída. Tente novamente.' 
        });
        setIsProcessing(false);
      }
    };

    if (loading || !session || !summary || !settings) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center">
                <CircleDashed className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    const isCouponDisabled = !!appliedCoupon || !!session.couponCode;
    
    return (
        <div className="min-h-screen w-full bg-muted/30">
            <header className="p-4 border-b bg-background flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/active-children')} disabled={isProcessing}>
                        <ArrowLeft className="h-4 w-4"/>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold font-headline">Finalizar Atendimento</h1>
                        <p className="text-sm text-muted-foreground">Responsável: {session.responsible}</p>
                    </div>
                </div>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 items-start">

                {/* Left Panel: Payment Actions */}
                <Card className="lg:col-span-3 hover:-translate-y-0 hover:shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary"/>Pagamento</CardTitle>
                        <CardDescription>Selecione as formas de pagamento e insira os valores.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Cupom de Última Hora</label>
                            <div className="flex gap-2">
                              <Input placeholder="INSERIR CUPOM" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="uppercase" disabled={isCouponDisabled}/>
                              <Button variant="outline" onClick={handleApplyCoupon} disabled={!couponCode || isLoadingCoupon || isCouponDisabled}>
                                {isLoadingCoupon ? <Loader2 className="h-4 w-4 animate-spin"/> : <Ticket className="h-4 w-4"/>}
                                Aplicar
                              </Button>
                            </div>
                        </div>

                        <Separator/>
                        
                        <div className="space-y-4">
                           <label className="text-sm font-medium">Formas de Pagamento</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                               {paymentMethodOptions.map(opt => (
                                    <Button 
                                        key={opt.name}
                                        variant={payments.some(p => p.method === opt.name) ? 'default' : 'outline'}
                                        onClick={() => togglePaymentMethod(opt.name)}
                                        className="justify-start text-left h-12"
                                    >
                                        <opt.icon className="mr-2 h-5 w-5"/>
                                        {opt.name}
                                    </Button>
                               ))}
                            </div>
                            <div className="space-y-3 pt-2">
                                {payments.map(p => (
                                    <div key={p.method} className="flex items-center gap-3">
                                        <label className="w-20 text-sm text-muted-foreground">{p.method}</label>
                                        <Input
                                          type="text"
                                          value={focusedPayment === p.method ? (p.amount || '') : formatCurrency(p.amount)}
                                          onFocus={() => setFocusedPayment(p.method)}
                                          onBlur={() => setFocusedPayment(null)}
                                          onChange={e => updatePaymentAmount(p.method, e.target.value)}
                                          placeholder="R$ 0,00"
                                        />
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => togglePaymentMethod(p.method)}>
                                            <MinusCircle className="h-5 w-5"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator/>

                        <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-muted-foreground">Total Pago</span>
                                <span className="font-mono text-lg font-semibold">{formatCurrency(paymentSummary.totalPaid)}</span>
                            </div>
                             <div className="flex justify-between items-baseline">
                                <span className="text-muted-foreground">Valor Restante</span>
                                <span className={cn(
                                    "font-mono text-lg font-semibold",
                                    paymentSummary.amountDue > 0 ? "text-destructive" : "text-green-600"
                                )}>
                                    {formatCurrency(paymentSummary.amountDue)}
                                </span>
                            </div>
                             <div className="flex justify-between items-baseline">
                                <span className="text-muted-foreground">Troco</span>
                                <span className="font-mono text-lg font-semibold">{formatCurrency(paymentSummary.changeGiven)}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                       <Button 
                        size="lg" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white" 
                        disabled={paymentSummary.amountDue > 0.001 || isProcessing}
                        onClick={handleConfirmSale}
                       >
                           {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <CheckCircle className="mr-2 h-5 w-5"/>}
                           {isProcessing ? 'Processando Venda...' : `Confirmar Venda ${formatCurrency(summary.total)}`}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Right Panel: Order Summary */}
                <Card className="lg:col-span-2 hover:-translate-y-0 hover:shadow-lg sticky top-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Receipt className="h-6 w-6 text-primary"/>Resumo da Conta</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(100vh-250px)] pr-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-muted-foreground">Custo por Tempo ({summary.hoursToCharge}h)</h4>
                                    <div className="space-y-1 rounded-md border bg-muted/50 p-2 text-sm">
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
                                <Separator/>
                                <div className="space-y-2">
                                     <h4 className="font-semibold text-muted-foreground">Consumo</h4>
                                     {session.consumption.length > 0 ? session.consumption.map(item => (
                                         <div key={item.productId} className="flex justify-between text-sm">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span className="font-mono">{formatCurrency(item.price * item.quantity)}</span>
                                         </div>
                                     )) : <p className="text-sm text-muted-foreground">Nenhum item consumido.</p>}
                                </div>
                                <Separator/>
                                 <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="font-mono">{formatCurrency(summary.subtotal)}</span>
                                    </div>
                                   {summary.discount > 0 && couponDescription && (
                                     <div className="flex justify-between text-green-600">
                                        <span className="flex items-center gap-1.5 text-xs"><Tag className="h-4 w-4"/> {couponDescription}</span>
                                        <span className="font-mono">- {formatCurrency(summary.discount)}</span>
                                    </div>
                                   )}
                                   {summary.alreadyPaid > 0 && (
                                     <div className="flex justify-between text-blue-600">
                                        <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4"/> Já Pago</span>
                                        <span className="font-mono">- {formatCurrency(summary.alreadyPaid)}</span>
                                    </div>
                                   )}
                                </div>
                                 <Separator />
                                <div className="flex justify-between items-baseline font-bold text-2xl">
                                    <span className="text-primary">Total a Pagar</span>
                                    <span className="font-mono text-primary">{formatCurrency(summary.total)}</span>
                                </div>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
