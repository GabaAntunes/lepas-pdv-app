
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CashSession, SaleRecord } from '@/types';
import { getOpenCashSession, openCashRegister, registerWithdrawal, closeCashRegister, getSalesForSession } from '@/services/cashRegisterService';
import { Banknote, CircleDashed, Moon, Sun, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { useRouter, useSearchParams } from 'next/navigation';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function OpenCashDialog({ onConfirm }: { onConfirm: (amount: number) => void }) {
  const [amount, setAmount] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    const numericAmount = parseFloat(amount.replace(',', '.')) || 0;
    onConfirm(numericAmount);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">Abrir Caixa</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir Caixa</DialogTitle>
          <DialogDescription>Insira o valor inicial para troco e suprimento.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="opening-balance">Valor de Abertura (R$)</Label>
          <Input id="opening-balance" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 100,00" />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleConfirm} disabled={!amount}>Confirmar Abertura</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({ onConfirm }: { onConfirm: (amount: number, reason: string) => void }) {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const handleConfirm = () => {
        const numericAmount = parseFloat(amount.replace(',', '.')) || 0;
        if (numericAmount > 0) {
            onConfirm(numericAmount, reason);
            setIsOpen(false);
            setAmount('');
            setReason('');
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">Registrar Sangria</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar Sangria (Retirada)</DialogTitle>
                    <DialogDescription>Registre uma retirada de dinheiro do caixa.</DialogDescription>
                </DialogHeader>
                 <div className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="withdraw-amount">Valor da Retirada (R$)</Label>
                        <Input id="withdraw-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 50,00" />
                    </div>
                     <div>
                        <Label htmlFor="withdraw-reason">Motivo (Opcional)</Label>
                        <Input id="withdraw-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Malote para o banco" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleConfirm} disabled={!amount}>Confirmar Retirada</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CloseCashDialog({ session, cashSalesTotal, onConfirm }: { session: CashSession, cashSalesTotal: number, onConfirm: (countedBalance: number) => void }) {
    const [countedBalance, setCountedBalance] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    const expectedBalance = session.openingBalance + cashSalesTotal - (session.withdrawals?.reduce((acc, w) => acc + w.amount, 0) || 0);
    const numericCountedBalance = parseFloat(countedBalance.replace(',', '.')) || 0;
    const difference = numericCountedBalance - expectedBalance;

    const handleConfirm = () => {
        onConfirm(numericCountedBalance);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" className="w-full">Fechar Caixa</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Conferência e Fechamento de Caixa</DialogTitle>
                    <DialogDescription>Confirme os valores para encerrar a sessão do caixa.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Card className="p-4 bg-muted/50">
                        <CardHeader className="p-0 pb-2">
                           <CardTitle className="text-base">Resumo do Caixa</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 text-sm space-y-1">
                            <div className="flex justify-between"><span>Abertura:</span><span className="font-mono">{formatCurrency(session.openingBalance)}</span></div>
                            <div className="flex justify-between"><span>Vendas em Dinheiro:</span><span className="font-mono">{formatCurrency(cashSalesTotal)}</span></div>
                            <div className="flex justify-between"><span>Sangrias:</span><span className="font-mono text-red-500">{formatCurrency(session.withdrawals?.reduce((acc, w) => acc + w.amount, 0) || 0)}</span></div>
                            <Separator className="my-2"/>
                            <div className="flex justify-between font-bold"><span>Valor Esperado:</span><span className="font-mono">{formatCurrency(expectedBalance)}</span></div>
                        </CardContent>
                    </Card>
                    <div>
                        <Label htmlFor="counted-balance">Valor Contado na Gaveta (R$)</Label>
                        <Input id="counted-balance" value={countedBalance} onChange={e => setCountedBalance(e.target.value)} placeholder="R$ 400,00" />
                    </div>
                     {countedBalance && (
                         <div className={`flex justify-between font-bold text-lg p-2 rounded-md ${difference === 0 ? 'bg-green-100' : 'bg-orange-100'}`}>
                            <span>Diferença:</span>
                            <span className={`font-mono ${difference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(difference)} ({difference > 0 ? "Sobra" : difference < 0 ? "Falta" : "Correto"})
                            </span>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button variant="destructive" onClick={handleConfirm} disabled={!countedBalance}>Confirmar Fechamento</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function CashRegisterPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [cashSession, setCashSession] = useState<CashSession | null | undefined>(undefined);
    const [sales, setSales] = useState<SaleRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSession = useCallback(async () => {
        try {
            const session = await getOpenCashSession();
            setCashSession(session);
            if (session) {
                const sessionSales = await getSalesForSession(session.openedAt);
                setSales(sessionSales);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao buscar sessão do caixa' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    const handleOpenCashRegister = async (openingBalance: number) => {
        if (!user) return toast({ variant: 'destructive', title: 'Usuário não autenticado' });
        setLoading(true);
        try {
            await openCashRegister(openingBalance, user);
            toast({ title: 'Caixa aberto com sucesso!' });

            const redirectUrl = searchParams.get('redirect');
            if (redirectUrl) {
                router.push(decodeURIComponent(redirectUrl));
            } else {
                await fetchSession();
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao abrir caixa' });
            console.error(error);
        } finally {
            const redirectUrl = searchParams.get('redirect');
            if (!redirectUrl) {
              setLoading(false);
            }
        }
    };

    const handleRegisterWithdrawal = async (amount: number, reason: string) => {
        if (!user || !cashSession) return;
        setLoading(true);
        try {
            await registerWithdrawal(cashSession.id, amount, reason, user);
            toast({ title: 'Sangria registrada com sucesso!' });
            await fetchSession();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao registrar sangria' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseCashRegister = async (countedBalance: number) => {
        if (!user || !cashSession) return;
        setLoading(true);
        try {
            const cashSales = sales.filter(s => s.paymentMethods.some(p => p.method === 'Dinheiro')).reduce((sum, s) => sum + s.paymentMethods.find(p => p.method === 'Dinheiro')!.amount, 0);
            await closeCashRegister(cashSession.id, countedBalance, cashSales, user);
            toast({ title: 'Caixa fechado com sucesso!' });
            setCashSession(null);
            setSales([]);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao fechar o caixa' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    
    const { cashSalesTotal, withdrawalsTotal, expectedInCash } = useMemo(() => {
        if (!cashSession) return { cashSalesTotal: 0, withdrawalsTotal: 0, expectedInCash: 0 };
        
        const cashSalesTotal = sales
            .flatMap(s => s.paymentMethods)
            .filter(p => p.method === 'Dinheiro')
            .reduce((sum, p) => sum + p.amount, 0);

        const withdrawalsTotal = cashSession.withdrawals?.reduce((sum, w) => sum + w.amount, 0) || 0;

        const expectedInCash = cashSession.openingBalance + cashSalesTotal - withdrawalsTotal;
        
        return { cashSalesTotal, withdrawalsTotal, expectedInCash };
    }, [cashSession, sales]);
    
    if (loading || cashSession === undefined) {
        return (
            <div className="min-h-screen bg-muted/40">
                <SettingsHeader title="Gestão de Caixa" showBackButton />
                <main className="p-6 flex items-center justify-center">
                    <CircleDashed className="h-10 w-10 animate-spin text-primary" />
                </main>
            </div>
        )
    }

  return (
    <div className="min-h-screen bg-muted/40">
      <SettingsHeader title="Gestão de Caixa" showBackButton />
      <main className="p-6">
        {cashSession ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sun className="text-primary"/> Caixa Aberto</CardTitle>
              <CardDescription>
                Aberto por {cashSession.openedBy.email} em {format(new Date(cashSession.openedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-background p-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Wallet className="h-4 w-4"/>Valor de Abertura</span>
                    <span className="font-mono font-medium">{formatCurrency(cashSession.openingBalance)}</span>
                  </div>
                   <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="h-4 w-4 text-green-500"/>Vendas em Dinheiro</span>
                    <span className="font-mono font-medium text-green-600">+{formatCurrency(cashSalesTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><TrendingDown className="h-4 w-4 text-red-500"/>Sangrias</span>
                    <span className="font-mono font-medium text-red-600">-{formatCurrency(withdrawalsTotal)}</span>
                  </div>
                  <Separator className="my-2"/>
                  <div className="flex justify-between font-bold text-base items-center">
                    <span className="flex items-center gap-2"><Banknote className="h-5 w-5"/>Valor Esperado em Caixa</span>
                    <span className="font-mono text-lg">{formatCurrency(expectedInCash)}</span>
                  </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <WithdrawDialog onConfirm={handleRegisterWithdrawal} />
                <CloseCashDialog session={cashSession} cashSalesTotal={cashSalesTotal} onConfirm={handleCloseCashRegister} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-sm mx-auto">
            <CardHeader className="text-center items-center">
                <Moon className="h-12 w-12 text-muted-foreground mb-2"/>
                <CardTitle>Caixa Fechado</CardTitle>
                <CardDescription>O caixa do dia ainda não foi aberto.</CardDescription>
            </CardHeader>
            <CardContent>
              <OpenCashDialog onConfirm={handleOpenCashRegister} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
