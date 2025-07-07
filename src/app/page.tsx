
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Users,
  CheckCircle,
  PlusCircle,
  ArrowRight,
  CalendarDays,
  Clock,
  CircleDashed
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BlurFade } from '@/components/magicui/blur-fade';
import { listenToActiveSessions } from '@/services/activeSessionService';
import { getAllSales } from '@/services/saleHistoryService';
import type { ActiveSession } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ActiveSessionRow } from '@/components/home/ActiveSessionRow';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const LiveClock = () => {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!currentDate) {
    return (
      <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <Skeleton className="h-4 w-[60px]" />
        </div>
      </div>
    );
  }

  const formattedDate = format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedTime = format(currentDate, "HH:mm:ss");

  return (
    <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4" />
        <span className="capitalize">{capitalize(formattedDate)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>{formattedTime}</span>
      </div>
    </div>
  );
};


export default function HomePage() {
  const [kpiStats, setKpiStats] = useState({
    revenueToday: 0,
    activeChildren: 0,
    activeSessionsCount: 0,
    completedToday: 0,
  });
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const allSales = await getAllSales();
        const today = new Date();
        const startOfToday = startOfDay(today);
        
        const todaysSales = allSales.filter(sale => new Date(sale.finalizedAt) >= startOfToday);
        const revenueToday = todaysSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
        const completedToday = todaysSales.length;

        setKpiStats(prev => ({ ...prev, revenueToday, completedToday }));
      } catch (error) {
        console.error("Error fetching sales data:", error);
      }
    };

    fetchSalesData();

    const unsubscribe = listenToActiveSessions(
      (sessions) => {
        const activeChildren = sessions.reduce((acc, s) => acc + s.children.length, 0);
        const activeSessionsCount = sessions.length;
        
        setActiveSessions(sessions);
        setKpiStats(prev => ({ ...prev, activeChildren, activeSessionsCount }));
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to active sessions:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const kpis = useMemo(() => [
    {
      title: 'Receita Total (Hoje)',
      value: formatCurrency(kpiStats.revenueToday),
      description: 'Faturamento concluído hoje',
      icon: DollarSign,
    },
    {
      title: 'Crianças Ativas',
      value: kpiStats.activeChildren.toString(),
      description: `em ${kpiStats.activeSessionsCount} atendimentos`,
      icon: Users,
    },
    {
      title: 'Atendimentos Hoje',
      value: kpiStats.completedToday.toString(),
      description: 'Total de check-outs finalizados',
      icon: CheckCircle,
    },
  ], [kpiStats]);

  const sortedActiveSessions = useMemo(() => {
    const calculateRemainingTime = (session: ActiveSession) => {
        const endTime = session.startTime + session.maxTime * 60 * 1000;
        return endTime - Date.now();
    };
    return [...activeSessions].sort((a, b) => calculateRemainingTime(a) - calculateRemainingTime(b));
  }, [activeSessions]);


  return (
    <MainLayout>
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
          <BlurFade delay={0.15}>
            <div>
              <h2 className="text-3xl font-bold tracking-tight font-headline">Início</h2>
              <p className="text-muted-foreground">Uma visão geral do seu parque hoje.</p>
            </div>
          </BlurFade>
          <BlurFade delay={0.25}>
            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
               <Link href="/new-session">
                <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Atendimento
                </Button>
              </Link>
              <LiveClock />
            </div>
          </BlurFade>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi, idx) => (
            <BlurFade key={kpi.title} delay={0.35 + idx * 0.1}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                     <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <div className="text-2xl font-bold">{kpi.value}</div>
                  )}
                  <p className="text-xs text-muted-foreground">{kpi.description}</p>
                </CardContent>
              </Card>
            </BlurFade>
          ))}
        </div>

        <BlurFade delay={0.55}>
          <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                  <CardTitle className="font-headline">Crianças Ativas Agora</CardTitle>
                  <CardDescription>Atendimentos ordenados pelo menor tempo restante.</CardDescription>
                  </div>
                  <Link href="/active-children" className="w-full sm:w-auto">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 w-full">
                      Gerenciar Atendimentos
                      <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  </Link>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                  <div className="divide-y divide-border -mx-6">
                  {loading ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                          <div key={idx} className="flex items-center py-4 first:pt-0 last:pb-0 px-6 gap-4">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="flex-1 space-y-2">
                                  <div className="flex justify-between items-baseline">
                                      <Skeleton className="h-4 w-[120px]" />
                                      <Skeleton className="h-4 w-[70px]" />
                                  </div>
                                  <Skeleton className="h-1.5 w-full" />
                              </div>
                          </div>
                      ))
                  ) : sortedActiveSessions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                          <CircleDashed className="h-10 w-10 text-muted-foreground mb-4" />
                          <p className="font-medium">Nenhum atendimento ativo no momento.</p>
                          <p className="text-sm text-muted-foreground">Clique em "Novo Atendimento" para começar.</p>
                      </div>
                  ) : (
                      sortedActiveSessions.map((session) => (
                         <Link key={session.id} href={`/active-children?highlight=${session.id}`} className="block transition-colors hover:bg-muted/50 px-6">
                            <ActiveSessionRow session={session} />
                        </Link>
                      ))
                  )}
                  </div>
              </CardContent>
          </Card>
        </BlurFade>
      </div>
    </MainLayout>
  );
}
