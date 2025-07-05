
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, AlertCircle, CheckCircle, Timer, ShoppingCart, History, ClipboardList, Plus, Minus, CircleDashed, XCircle, LogOut, Search, Loader2 } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { ActiveSession, Settings } from '@/types';
import { listenToActiveSessions, addTimeToSession, deleteActiveSession } from '@/services/activeSessionService';
import { getOpenCashSession } from '@/services/cashRegisterService';
import { getSettings } from '@/services/settingsService';
import { ConsumptionModal } from './ConsumptionModal';
import { SummaryModal } from './SummaryModal';
import { HistoryModal } from './HistoryModal';
import { Skeleton } from '../ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

function CloseSessionDialog({ session, onSessionClosed }: { session: ActiveSession, onSessionClosed: (id: string) => void }) {
    const { toast } = useToast();

    const handleClose = async (isError: boolean) => {
        try {
            await deleteActiveSession(session.id);
            onSessionClosed(session.id);
            toast({
                title: 'Atendimento Encerrado',
                description: `O atendimento de ${session.responsible} foi ${isError ? 'cancelado' : 'encerrado'}.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao encerrar',
                description: 'Não foi possível encerrar o atendimento.',
            });
            console.error(error);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0">
                    <XCircle className="h-5 w-5" />
                    <span className="sr-only">Encerrar atendimento</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar Atendimento?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Você tem certeza que deseja encerrar o atendimento de {session.responsible}? Escolha uma das opções abaixo.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <Button variant="destructive" onClick={() => handleClose(true)}>
                        <XCircle className="mr-2 h-4 w-4"/>
                        Foi um Erro (Apagar)
                    </Button>
                    <AlertDialogAction onClick={() => handleClose(false)} className="bg-blue-600 hover:bg-blue-700">
                       <LogOut className="mr-2 h-4 w-4"/>
                        Criança Saiu (Encerrar)
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

interface SessionCardProps {
  session: ActiveSession;
  settings: Settings;
  onAddTime: (sessionId: string, hours: number) => void;
  onOpenConsumption: (session: ActiveSession) => void;
  onOpenSummary: (session: ActiveSession) => void;
  onOpenHistory: (session: ActiveSession) => void;
  onSessionClosed: (id: string) => void;
  isHighlighted?: boolean;
}

function SessionCard({ session, settings, onAddTime, onOpenConsumption, onOpenSummary, onOpenHistory, onSessionClosed, isHighlighted = false }: SessionCardProps) {
  const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
  const [hoursToAdd, setHoursToAdd] = useState(1);
  const valorHoraAdicional = settings.additionalHourRate;

  const { toast } = useToast();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  const { id, startTime, maxTime: maxTimeInMinutes, consumption } = session;
  const maxTimeInSeconds = maxTimeInMinutes * 60;

  const calculateState = useCallback(() => {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const remainingSeconds = maxTimeInSeconds - elapsedSeconds;
    
    const isTimeUp = remainingSeconds <= 0;

    let formattedTime;
    if (isTimeUp) {
        formattedTime = "00:00:00";
    } else {
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;
        formattedTime = [hours, minutes, seconds].map(v => v.toString().padStart(2, '0')).join(':');
    }
    
    const progressPercentage = (Math.max(0, remainingSeconds) / maxTimeInSeconds) * 100;
    
    const hasConsumption = consumption && consumption.length > 0;
    const hasBalance = !session.isInitialPaymentMade || hasConsumption || isTimeUp;

    let progressColorClass = 'bg-gradient-to-r from-green-400 to-green-600';
    let buttonColorClass = 'bg-green-600 hover:bg-green-700 text-white';
    let textColorClass = 'text-green-600';
    let icon = <CheckCircle className="h-5 w-5 mr-2" />;
    let timeLabel = 'Tempo restante';
    let buttonText = hasBalance ? 'Acertar Conta' : 'Tudo Certo';

    if (isTimeUp) {
        progressColorClass = 'bg-gradient-to-r from-orange-500 to-red-600';
        buttonColorClass = 'bg-red-600 hover:bg-red-700 text-white';
        textColorClass = 'text-red-600';
        icon = <AlertCircle className="h-5 w-5 mr-2" />;
        timeLabel = 'Tempo Esgotado';
        buttonText = 'Acertar Conta (Atrasado)';
    } else if (progressPercentage <= 20) {
        progressColorClass = 'bg-gradient-to-r from-orange-500 to-red-600';
        buttonColorClass = 'bg-red-600 hover:bg-red-700 text-white';
        textColorClass = 'text-red-600';
        icon = <AlertCircle className="h-5 w-5 mr-2" />;
    } else if (progressPercentage <= 50) {
        progressColorClass = 'bg-gradient-to-r from-yellow-400 to-orange-500';
        buttonColorClass = 'bg-yellow-500 hover:bg-yellow-600 text-white';
        textColorClass = 'text-yellow-600';
        icon = <AlertCircle className="h-5 w-5 mr-2" />;
    }

    return {
        formattedTime,
        progressPercentage,
        progressColorClass,
        buttonColorClass,
        textColorClass,
        icon,
        timeLabel,
        buttonText,
        hasBalance,
        isTimeUp,
    };
  }, [startTime, maxTimeInSeconds, consumption, session.isInitialPaymentMade]);

  const [timerState, setTimerState] = useState(calculateState());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimerState(calculateState());
    }, 1000);
    return () => clearInterval(timer);
  }, [calculateState]);

  useEffect(() => {
    if (timerState.isTimeUp && !notificationSent) {
      toast({
        title: "Tempo Esgotado!",
        description: `O tempo para ${session.responsible} (${session.children.join(", ")}) acabou.`,
        variant: "destructive",
        duration: 30000,
      });
      setNotificationSent(true);
    }
  }, [timerState.isTimeUp, notificationSent, session, toast]);

  const handleSettleAccountClick = async () => {
    setIsRedirecting(true);
    try {
        const cashSession = await getOpenCashSession();
        if (cashSession) {
            router.push(`/pos/${session.id}`);
        } else {
            toast({
                title: "Caixa Fechado",
                description: "É necessário abrir o caixa para registrar vendas. Redirecionando...",
                variant: 'destructive',
                duration: 5000,
            });
            router.push(`/settings/cash-register?redirect=${encodeURIComponent(`/pos/${session.id}`)}`);
        }
    } catch (error) {
        console.error("Failed to check cash register status:", error);
        toast({
            title: "Erro ao verificar o caixa",
            description: "Não foi possível verificar o status do caixa. Tente novamente.",
            variant: "destructive"
        });
        setIsRedirecting(false);
    }
  };

  const handleConfirmAddTime = () => {
    onAddTime(id, hoursToAdd);
    setIsAddTimeOpen(false);
    setHoursToAdd(1);
  };

  const openDialog = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    setIsAddTimeOpen(true);
  }

  const renderMainButton = () => {
    const buttonContent = (
      <>
        {isRedirecting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle className="h-5 w-5 mr-2" />}
        {isRedirecting ? "Verificando..." : (timerState.hasBalance ? timerState.buttonText : "Tudo Certo")}
      </>
    );

    if (!timerState.hasBalance) {
        return (
            <Button className={`w-full bg-gray-400`} disabled>
                <CheckCircle className="h-5 w-5 mr-2" />
                {"Tudo Certo"}
            </Button>
        );
    }

    return (
        <Button className={`w-full ${timerState.buttonColorClass}`} disabled={!timerState.hasBalance || isRedirecting} onClick={handleSettleAccountClick}>
           {buttonContent}
        </Button>
    );
  };


  return (
    <Card className={cn(
        "flex flex-col transition-all", 
        timerState.isTimeUp && "animate-flash-red", 
        isHighlighted && "ring-2 ring-primary ring-offset-2 shadow-xl"
    )}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className="flex-grow pr-2">
                <CardTitle className="font-headline flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {session.responsible}
                </CardTitle>
                <CardDescription>{session.children.join(', ')}</CardDescription>
            </div>
            <CloseSessionDialog session={session} onSessionClosed={onSessionClosed} />
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <div className={`flex items-center text-sm font-medium ${timerState.textColorClass}`}>
                    {timerState.icon}
                    <span>{timerState.timeLabel}</span>
                </div>
                <span className="font-mono text-lg font-bold">{timerState.formattedTime}</span>
            </div>
            <Progress value={timerState.progressPercentage} className="h-2" indicatorClassName={timerState.progressColorClass} />
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 pt-4">
        <div className="flex w-full items-center justify-around">
            <Dialog open={isAddTimeOpen} onOpenChange={setIsAddTimeOpen}>
              <Tooltip>
                  <TooltipTrigger asChild>
                     <Button variant="ghost" size="icon" onClick={openDialog}>
                        <Timer className="h-5 w-5" />
                        <span className="sr-only">Adicionar Tempo</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>Adicionar Tempo</p>
                  </TooltipContent>
              </Tooltip>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Tempo Extra</DialogTitle>
                  <DialogDescription>
                    Selecione quantas horas deseja adicionar. O valor da hora adicional é de {formatCurrency(valorHoraAdicional)}.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center gap-4 py-4">
                  <Button variant="outline" size="icon" onClick={() => setHoursToAdd(h => Math.max(1, h - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col items-center gap-1">
                    <Label htmlFor="horas" className="text-sm text-muted-foreground">Horas</Label>
                    <span id="horas" className="text-4xl font-bold">{hoursToAdd}</span>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setHoursToAdd(h => h + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center font-semibold text-lg">
                  Custo Adicional: {formatCurrency(hoursToAdd * valorHoraAdicional * session.children.length)}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddTimeOpen(false)}>Cancelar</Button>
                  <Button onClick={handleConfirmAddTime}>Confirmar e Adicionar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onOpenConsumption(session)}>
                        <ShoppingCart className="h-5 w-5" />
                          <span className="sr-only">Adicionar Consumo</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Adicionar Consumo</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onOpenHistory(session)}>
                        <History className="h-5 w-5" />
                          <span className="sr-only">Ver Histórico</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Ver Histórico</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onOpenSummary(session)}>
                        <ClipboardList className="h-5 w-5" />
                          <span className="sr-only">Ver Resumo</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Ver Resumo</p>
                </TooltipContent>
            </Tooltip>
        </div>
        {renderMainButton()}
      </CardFooter>
    </Card>
  );
}

function LoadingSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 pt-4">
                <div className="flex w-full items-center justify-around">
                   <Skeleton className="h-10 w-10 rounded-full" />
                   <Skeleton className="h-10 w-10 rounded-full" />
                   <Skeleton className="h-10 w-10 rounded-full" />
                   <Skeleton className="h-10 w-10 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    );
}


export function ActiveSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [sessionForModal, setSessionForModal] = useState<ActiveSession | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightedId = searchParams.get('highlight');
  const cardRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    if (highlightedId && cardRefs.current.has(highlightedId) && !isLoading) {
        const cardElement = cardRefs.current.get(highlightedId);
        cardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const timer = setTimeout(() => {
            router.replace('/active-children', { scroll: false });
        }, 3000);

        return () => clearTimeout(timer);
    }
  }, [highlightedId, isLoading, router, sessions]);

  useEffect(() => {
    setIsLoading(true);
    getSettings().then(setSettings).catch(error => {
        toast({
          variant: "destructive",
          title: "Erro ao carregar configurações",
          description: error.message,
        });
    });

    const unsubscribe = listenToActiveSessions(
      (fetchedSessions) => {
        setSessions(fetchedSessions);
        setIsLoading(false);
      },
      (error) => {
        toast({
          variant: "destructive",
          title: "Erro ao carregar atendimentos",
          description: error.message,
        });
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [toast]);
  
  const sortedAndFilteredSessions = useMemo(() => {
    const calculateRemainingTime = (session: ActiveSession) => {
        const endTime = session.startTime + session.maxTime * 60 * 1000;
        return endTime - Date.now();
    };

    const sorted = [...sessions].sort((a, b) => calculateRemainingTime(a) - calculateRemainingTime(b));

    if (!searchTerm) {
      return sorted;
    }
    
    const lowercasedFilter = searchTerm.toLowerCase();
    
    return sorted.filter(session => {
      const responsibleMatch = session.responsible.toLowerCase().includes(lowercasedFilter);
      const cpfMatch = session.responsibleCpf.replace(/[.-]/g, '').includes(lowercasedFilter.replace(/[.-]/g, ''));
      const childrenMatch = session.children.some(child => child.toLowerCase().includes(lowercasedFilter));
      
      return responsibleMatch || cpfMatch || childrenMatch;
    });
  }, [sessions, searchTerm]);


  const handleAddTime = async (sessionId: string, hoursToAdd: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !settings) return;

    const newMaxTime = session.maxTime + hoursToAdd * 60;
    const cost = hoursToAdd * settings.additionalHourRate * session.children.length;

    try {
      await addTimeToSession(sessionId, newMaxTime);
      toast({ 
          title: "Tempo adicionado com sucesso!",
          description: `Adicionado ${hoursToAdd}h por ${formatCurrency(cost)}.`
      });
    } catch (error) {
       console.error(error);
       toast({
         variant: "destructive",
         title: "Erro ao adicionar tempo",
         description: "Ocorreu um erro ao atualizar o atendimento.",
       });
    }
  };

  const handleOpenConsumptionModal = (session: ActiveSession) => {
    setSessionForModal(session);
    setIsConsumptionModalOpen(true);
  }

  const handleOpenSummary = (session: ActiveSession) => {
    setSessionForModal(session);
    setIsSummaryModalOpen(true);
  };

  const handleOpenHistory = (session: ActiveSession) => {
    setSessionForModal(session);
    setIsHistoryModalOpen(true);
  };

  const handleSessionClosed = (closedId: string) => {
      setSessions(prev => prev.filter(s => s.id !== closedId));
  }

  const closeModal = () => {
    setIsConsumptionModalOpen(false);
    setIsSummaryModalOpen(false);
    setIsHistoryModalOpen(false);
    setSessionForModal(null);
  }

  if (isLoading || !settings) {
      return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx}>
                        <LoadingSkeleton />
                    </div>
                ))}
            </div>
        </div>
      );
  }

  if (sessions.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center h-[400px]">
              <CircleDashed className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold font-headline">Nenhuma Criança Ativa</h3>
              <p className="text-muted-foreground mt-2">
                  Adicione um novo atendimento para começar a monitorar o tempo.
              </p>
          </div>
      )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nome do responsável, criança ou CPF..."
            className="w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {sortedAndFilteredSessions.length === 0 ? (
           <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center h-[400px]">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold font-headline">Nenhum Resultado Encontrado</h3>
              <p className="text-muted-foreground mt-2">
                  Tente ajustar os termos da sua busca.
              </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedAndFilteredSessions.map((session) => (
              <div key={session.id} ref={(el) => cardRefs.current.set(session.id, el)}>
                <SessionCard 
                    session={session} 
                    settings={settings}
                    onAddTime={handleAddTime}
                    onOpenConsumption={handleOpenConsumptionModal}
                    onOpenSummary={handleOpenSummary}
                    onOpenHistory={handleOpenHistory}
                    onSessionClosed={handleSessionClosed}
                    isHighlighted={session.id === highlightedId}
                  />
              </div>
            ))}
          </div>
        )}
      </div>
      
      <ConsumptionModal
        isOpen={isConsumptionModalOpen}
        onClose={closeModal}
        session={sessionForModal}
      />
      <SummaryModal
        isOpen={isSummaryModalOpen}
        onClose={closeModal}
        session={sessionForModal}
        settings={settings}
      />
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={closeModal}
        responsibleCpf={sessionForModal?.responsibleCpf ?? null}
      />

    </TooltipProvider>
  );
}
