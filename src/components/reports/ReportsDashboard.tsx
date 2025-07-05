
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DollarSign, Receipt, Users, BarChart2, Filter } from 'lucide-react';
import { getAllSales } from '@/services/saleHistoryService';
import { SaleRecord } from '@/types';
import { addDays, format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { CircleDashed, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const ChartCard = ({ title, description, children, isLoading, className }: { title: string, description?: string, children: React.ReactNode, isLoading: boolean, className?: string }) => (
    <Card className={className}>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="pl-2">
            {isLoading ? (
                <div className="flex items-center justify-center h-[250px]">
                    <CircleDashed className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {children}
                    </ResponsiveContainer>
                </div>
            )}
        </CardContent>
    </Card>
);

const ReportsPageContent = () => {
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -4)),
    to: endOfDay(new Date()),
  });

  useEffect(() => {
    setLoading(true);
    getAllSales()
      .then(salesData => {
        setAllSales(salesData.sort((a, b) => b.finalizedAt - a.finalizedAt));
      })
      .catch(() => setError("Não foi possível carregar os dados de vendas."))
      .finally(() => setLoading(false));
  }, []);

  const filteredSales = useMemo(() => {
    if (!dateRange?.from) return [];
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    return allSales.filter(sale => {
      const saleDate = new Date(sale.finalizedAt);
      return saleDate >= from && saleDate <= to;
    });
  }, [allSales, dateRange]);
  
  const kpiStats = useMemo(() => {
    const receitaTotal = filteredSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const vendasTotais = filteredSales.length;
    const ticketMedio = vendasTotais > 0 ? receitaTotal / vendasTotais : 0;
    const criancasAtendidas = filteredSales.reduce((acc, sale) => acc + (sale.children?.length || 0), 0);
    return { receitaTotal, vendasTotais, ticketMedio, criancasAtendidas };
  }, [filteredSales]);

  const kpis = [
    { title: "Receita Total", value: formatCurrency(kpiStats.receitaTotal), description: "no período selecionado", icon: DollarSign },
    { title: "Vendas Totais", value: kpiStats.vendasTotais, description: "atendimentos finalizados", icon: Receipt },
    { title: "Ticket Médio", value: formatCurrency(kpiStats.ticketMedio), description: "valor médio por venda", icon: BarChart2 },
    { title: "Crianças Atendidas", value: kpiStats.criancasAtendidas, description: "total de crianças no período", icon: Users },
  ];

  const faturamentoPorPeriodo = useMemo(() => {
    if (!dateRange?.from) return [];
    
    const start = startOfDay(dateRange.from);
    const end = dateRange.to ? endOfDay(dateRange.to) : startOfDay(dateRange.from);

    if (end < start) return [];

    const dailyRevenueMap = new Map<string, number>();
    filteredSales.forEach(sale => {
        const day = format(sale.finalizedAt, 'yyyy-MM-dd');
        dailyRevenueMap.set(day, (dailyRevenueMap.get(day) || 0) + sale.totalAmount);
    });
    
    const allDaysInRange = eachDayOfInterval({ start, end });

    const data = allDaysInRange.map(day => {
        const formattedDayKey = format(day, 'yyyy-MM-dd');
        const formattedDayLabel = format(day, 'dd/MM');
        return {
            name: formattedDayLabel,
            Faturamento: dailyRevenueMap.get(formattedDayKey) || 0,
        };
    });
    
    if (data.length === 1 && data[0].Faturamento > 0) {
      return [{ name: data[0].name, Faturamento: 0 }, data[0]];
    }

    return data;
  }, [filteredSales, dateRange]);

  const formasDePagamento = useMemo(() => {
    const paymentMethodsMap = new Map<string, number>();
    filteredSales.forEach(sale => {
        sale.paymentMethods.forEach(payment => {
            paymentMethodsMap.set(payment.method, (paymentMethodsMap.get(payment.method) || 0) + payment.amount);
        });
    });
    return Array.from(paymentMethodsMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredSales]);

  const produtosMaisVendidos = useMemo(() => {
    const productsMap = new Map<string, { name: string, quantity: number }>();
    filteredSales.forEach(sale => {
        sale.consumption.forEach(item => {
            const existing = productsMap.get(item.productId);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                productsMap.set(item.productId, { name: item.name, quantity: item.quantity });
            }
        });
    });
    return Array.from(productsMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
  }, [filteredSales]);

  const horariosDePico = useMemo(() => {
    const hourlyMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) hourlyMap.set(i, 0);

    filteredSales.forEach(sale => {
        const hour = new Date(sale.finalizedAt).getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });
    return Array.from(hourlyMap.entries())
      .map(([hour, count]) => ({ name: `${hour.toString().padStart(2, '0')}:00`, Atendimentos: count }))
      .sort((a,b) => parseInt(a.name) - parseInt(b.name));
  }, [filteredSales]);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const ITEMS_PER_PAGE = 10;

  const tableData = useMemo(() => {
    return filteredSales.filter(sale => 
      sale.responsible.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filteredSales, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return tableData.slice(start, end);
  }, [tableData, currentPage]);

  const totalPages = Math.max(1, Math.ceil(tableData.length / ITEMS_PER_PAGE));

  const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  if (error) {
      return (
          <Card className="col-span-full"><CardContent className="flex flex-col items-center justify-center p-8 gap-4"><AlertTriangle className="h-10 w-10 text-destructive"/><p className="font-semibold text-lg text-destructive">Erro ao carregar relatórios</p><p className="text-muted-foreground">{error}</p></CardContent></Card>
      )
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
            <PopoverTrigger asChild>
            <Button
                id="date"
                variant={"outline"}
                className={cn("w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
            >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                dateRange.to ? (
                    <>
                    {format(dateRange.from, "LLL dd, y", { locale: ptBR })} -{" "}
                    {format(dateRange.to, "LLL dd, y", { locale: ptBR })}
                    </>
                ) : (
                    format(dateRange.from, "LLL dd, y", { locale: ptBR })
                )
                ) : (
                <span>Escolha uma data</span>
                )}
            </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    locale={ptBR}
                    numberOfMonths={1}
                />
            </PopoverContent>
        </Popover>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros Rápidos
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })}>Hoje</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange({ from: startOfDay(addDays(new Date(), -1)), to: endOfDay(addDays(new Date(), -1)) })}>Ontem</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange({ from: startOfDay(addDays(new Date(), -6)), to: endOfDay(new Date()) })}>Últimos 7 dias</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>Este Mês</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) })}>Mês Passado</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDateRange({ from: startOfDay(addDays(new Date(), -4)), to: endOfDay(new Date()) })}>Redefinir (Últimos 5 dias)</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        {kpis.map((kpi, idx) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <CircleDashed className="h-6 w-6 animate-spin text-muted-foreground" /> : (
                <>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground">{kpi.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
          <div className="lg:col-span-2">
            <ChartCard title="Faturamento por Período" description="Evolução da receita no período selecionado." isLoading={loading}>
                <AreaChart data={faturamentoPorPeriodo}>
                    <defs>
                        <linearGradient id="faturamentoGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value as number)} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} cursor={{fill: 'hsl(var(--muted))'}}/>
                    <Area type="monotone" dataKey="Faturamento" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#faturamentoGradient)" />
                </AreaChart>
            </ChartCard>
          </div>

          <div>
            <ChartCard title="Formas de Pagamento" description="Distribuição da receita por método." isLoading={loading}>
                <PieChart>
                    <Pie data={formasDePagamento} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {formasDePagamento.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke={PIE_COLORS[index % PIE_COLORS.length]} fillOpacity={0.6} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                </PieChart>
            </ChartCard>
          </div>

          <div>
            <ChartCard title="Horários de Pico" description="Número de atendimentos iniciados por hora." isLoading={loading}>
                <AreaChart data={horariosDePico}>
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Atendimentos" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorUv)" />
                </AreaChart>
            </ChartCard>
          </div>
      </div>

      <div className="pt-6">
        <ChartCard title="Produtos Mais Vendidos" description="Top 10 produtos por quantidade vendida." isLoading={loading}>
            <BarChart data={produtosMaisVendidos} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                <Tooltip formatter={(value) => `${value} unidades`} cursor={{fill: 'hsl(var(--muted))'}}/>
                <Bar dataKey="quantity" name="Quantidade" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={20}>
                  {produtosMaisVendidos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--chart-2))" fillOpacity={1 - (index * 0.08)} />
                  ))}
                </Bar>
            </BarChart>
        </ChartCard>
      </div>

      <div className="pt-6">
        <Card>
            <CardHeader>
                <CardTitle>Vendas Detalhadas</CardTitle>
                <CardDescription>
                    Exibindo {tableData.length} vendas para o período selecionado.
                </CardDescription>
                <Input placeholder="Buscar por responsável..." className="max-w-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data/Hora</TableHead>
                                <TableHead>Responsável</TableHead>
                                <TableHead>Itens</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4} className="text-center p-4"><CircleDashed className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>)
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map(sale => (
                                <TableRow key={sale.id} onClick={() => setSelectedSale(sale)} className="cursor-pointer">
                                    <TableCell>{format(sale.finalizedAt, "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                                    <TableCell>{sale.responsible}</TableCell>
                                    <TableCell>{sale.timeCost > 0 ? `${sale.durationInMinutes}min` : ''}{sale.consumption.length > 0 ? ` + ${sale.consumption.length} item(s)` : ''}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(sale.totalAmount)}</TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">Nenhuma venda encontrada para o período.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft /> Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Próxima <ChevronRight />
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
      
      {selectedSale && <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="font-headline">Recibo da Venda</DialogTitle>
                <DialogDescription>
                    Detalhes da venda de {selectedSale.responsible} em {format(selectedSale.finalizedAt, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1 pr-4">
                {/* Venda Info */}
                <div className="space-y-2 text-sm">
                    <p className="font-semibold">Resumo da Venda</p>
                    <Separator/>
                    <div className="flex justify-between"><span className="text-muted-foreground">Responsável</span><span>{selectedSale.responsible}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">CPF</span><span>{selectedSale.responsibleCpf}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Crianças</span><span>{selectedSale.children.join(', ')}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Duração</span><span>{selectedSale.durationInMinutes} min</span></div>
                </div>
                
                {/* Detalhes Financeiros */}
                <div className="space-y-2 text-sm">
                    <p className="font-semibold">Detalhes Financeiros</p>
                    <Separator/>

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Custo (Tempo)</span>
                        <span className="font-mono">{formatCurrency(selectedSale.timeCost)}</span>
                    </div>
                    {selectedSale.children.length > 0 && selectedSale.timeCost > 0 && (
                        <div className="flex justify-end text-xs text-muted-foreground/80">
                            <span>
                                ({selectedSale.children.length} {selectedSale.children.length > 1 ? 'crianças' : 'criança'} x {formatCurrency(selectedSale.timeCost / selectedSale.children.length)})
                            </span>
                        </div>
                    )}
                    
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Custo (Consumo)</span>
                        <span className="font-mono">{formatCurrency(selectedSale.consumptionCost)}</span>
                    </div>
                     {selectedSale.consumption.length > 0 && (
                        <div className="space-y-1 text-xs text-muted-foreground/80 pl-4">
                            {selectedSale.consumption.map(item => (
                                <div key={item.productId} className="flex justify-between">
                                    <span>{item.quantity}x {item.name}</span>
                                    <span className="font-mono">{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Pagamento */}
                <div className="space-y-2 text-sm">
                    <Separator/>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-mono">{formatCurrency(selectedSale.timeCost + selectedSale.consumptionCost)}</span>
                    </div>
                    {selectedSale.discountApplied && selectedSale.discountApplied > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span className="flex items-center gap-1.5">Cupom ({selectedSale.couponCode})</span>
                            <span className="font-mono">- {formatCurrency(selectedSale.discountApplied)}</span>
                        </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                        <span className="text-muted-foreground">Total Pago</span>
                        <span className="font-mono">{formatCurrency(selectedSale.totalAmount)}</span>
                    </div>

                    {selectedSale.paymentMethods.length > 1 ? (
                        <div className="space-y-1 text-muted-foreground pl-4">
                            {selectedSale.paymentMethods.map((p, index) => (
                                <div key={index} className="flex justify-between">
                                    <span>- {p.method}</span>
                                    <span className="font-mono">{formatCurrency(p.amount)}</span>
                                </div>
                            ))}
                        </div>
                    ) : selectedSale.paymentMethods.length === 1 ? (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Forma de Pagamento</span>
                            <span>{selectedSale.paymentMethods[0].method}</span>
                        </div>
                    ) : null}
                    
                    {selectedSale.changeGiven > 0 && (
                        <div className="flex justify-between text-blue-600 font-medium pt-1">
                            <span className="text-muted-foreground">Troco</span>
                            <span className="font-mono">{formatCurrency(selectedSale.changeGiven)}</span>
                        </div>
                    )}
                </div>
            </div>
             <div className="flex justify-end pt-4">
                <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
            </div>
        </DialogContent>
      </Dialog>}
    </>
  );
}

export function ReportsDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; 
  }

  return (
    <div className="space-y-6">
      <ReportsPageContent />
    </div>
  );
}
