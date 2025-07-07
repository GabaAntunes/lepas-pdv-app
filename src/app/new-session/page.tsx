'use client';

import { MainLayout } from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addActiveSession } from '@/services/activeSessionService';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, PartyPopper, Plus, Minus, Ticket } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Coupon, Settings } from '@/types';
import { getCouponByCode } from '@/services/couponService';
import { getSettings } from '@/services/settingsService';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  responsible: z.string().min(3, { message: 'O nome do responsável deve ter pelo menos 3 caracteres.' }),
  cpf: z.string().length(14, { message: 'O CPF deve ser válido e ter 11 dígitos.' }),
  phone: z.string().max(15).optional().or(z.literal('')),
  children: z.string().min(2, { message: 'O nome da criança deve ter pelo menos 2 caracteres.' }),
  coupon: z.string().optional(),
});

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const formatCpf = (value: string) => {
  if (!value) return value;
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .substring(0, 14);
};

const formatPhone = (value: string) => {
  if (!value) return value;
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 15);
};


export default function NewSessionPage() {
  const [loading, setLoading] = useState(false);
  const [sessionType, setSessionType] = useState<'hourly' | 'fullAfternoon'>('hourly');
  const [contractedHours, setContractedHours] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [isLoadingCoupon, setIsLoadingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      responsible: '',
      cpf: '',
      phone: '',
      children: '',
      coupon: '',
    },
  });
  
  useEffect(() => {
    getSettings().then(setSettings).catch(err => {
        console.error(err);
        toast({ variant: 'destructive', title: 'Erro ao carregar configurações de preço.'});
    });
  }, [toast]);

  const childrenValue = form.watch('children');
  const couponCode = form.watch('coupon');

  const childrenCount = useMemo(() => {
    return childrenValue.split(',').map(name => name.trim()).filter(name => name).length;
  }, [childrenValue]);

  const totalMinutes = useMemo(() => {
    return contractedHours * 60;
  }, [contractedHours]);

  const totalDurationString = useMemo(() => {
    if (sessionType === 'fullAfternoon') return "Tarde Toda";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }, [totalMinutes, sessionType]);

  // Price calculation
  useEffect(() => {
    if (!settings || childrenCount <= 0) {
      setBasePrice(0);
      setDiscount(0);
      setTotalPrice(0);
      return;
    }

    let newBasePrice = 0;
    let priceForCouponCalc = 0;

    if (sessionType === 'hourly') {
        priceForCouponCalc = settings.firstHourRate * childrenCount;
        const additionalHoursPrice = (Math.max(0, contractedHours - 1)) * settings.additionalHourRate * childrenCount;
        newBasePrice = priceForCouponCalc + additionalHoursPrice;
    } else { // fullAfternoon
        newBasePrice = settings.fullAfternoonRate * childrenCount;
        priceForCouponCalc = newBasePrice;
    }
    setBasePrice(newBasePrice);
    
    // Calculate discount based on applied coupon.
    let newDiscount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'percentage') {
        newDiscount = priceForCouponCalc * (appliedCoupon.discountValue / 100);
      } else if (appliedCoupon.discountType === 'fixed') {
        newDiscount = appliedCoupon.discountValue;
      } else if (appliedCoupon.discountType === 'freeTime') {
        if (sessionType === 'hourly' && contractedHours === 1) {
          const costPerMinute = settings.firstHourRate / 60;
          const discountFromTime = costPerMinute * appliedCoupon.discountValue;
          const discountPerChild = Math.min(discountFromTime, settings.firstHourRate);
          newDiscount = discountPerChild * childrenCount;
        }
      }
    }
    setDiscount(newDiscount);

    // Final total price
    setTotalPrice(Math.max(0, newBasePrice - newDiscount));
  }, [contractedHours, childrenCount, settings, appliedCoupon, sessionType]);


  // Coupon validation effect
  useEffect(() => {
    const isFreeTimeAndNotApplicable = appliedCoupon?.discountType === 'freeTime' && (contractedHours > 1 || sessionType === 'fullAfternoon');
    
    if (isFreeTimeAndNotApplicable) {
      toast({
        variant: 'destructive',
        title: 'Cupom de Tempo Inválido',
        description: sessionType === 'fullAfternoon'
          ? 'Cupons de tempo grátis não são válidos para a contratação da Tarde Toda.'
          : 'Cupons de tempo grátis são válidos apenas para a contratação de 1 hora.',
      });
      setAppliedCoupon(null);
      form.setValue('coupon', '');
    }
  }, [contractedHours, sessionType, appliedCoupon, form, toast]);


  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsLoadingCoupon(true);
    setAppliedCoupon(null);
    try {
      const coupon = await getCouponByCode(couponCode);
      if (coupon && coupon.status === 'active') {
        const isFreeTimeAndNotApplicable = coupon.discountType === 'freeTime' && (contractedHours > 1 || sessionType === 'fullAfternoon');
        
        if (isFreeTimeAndNotApplicable) {
          toast({
            variant: 'destructive',
            title: 'Cupom não aplicável',
            description: sessionType === 'fullAfternoon'
              ? 'Cupons de tempo só podem ser aplicados na contratação por hora.'
              : 'Cupons de tempo grátis só podem ser aplicados na contratação de 1 hora.',
          });
          form.setValue('coupon', '');
        } else {
          setAppliedCoupon(coupon);
          let description = '';
          if (coupon.discountType === 'fixed') {
              description = `Desconto de ${formatCurrency(coupon.discountValue)} aplicado.`;
          } else if (coupon.discountType === 'percentage') {
              description = `Desconto de ${coupon.discountValue}% aplicado.`;
          } else if (coupon.discountType === 'freeTime') {
              description = `Desconto de ${coupon.discountValue} minutos aplicado na primeira hora.`;
          }
          toast({ title: "Cupom aplicado com sucesso!", description });
        }
      } else {
        toast({ variant: 'destructive', title: "Cupom inválido ou expirado" });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Erro ao aplicar cupom" });
    } finally {
      setIsLoadingCoupon(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const childrenArray = values.children.split(',').map(name => name.trim()).filter(name => name);
      if (childrenArray.length === 0) {
        form.setError('children', { type: 'custom', message: 'É necessário informar o nome de pelo menos uma criança.' });
        setLoading(false);
        return;
      }
      
      const isFullAfternoon = sessionType === 'fullAfternoon';
      const timeInMinutes = isFullAfternoon ? 9999 : totalMinutes; // 9999 is a sentinel value for "unlimited"

      await addActiveSession({
        responsible: values.responsible,
        responsibleCpf: values.cpf,
        children: childrenArray,
        maxTime: timeInMinutes,
        isFullAfternoon,
        ...(values.phone && { responsiblePhone: values.phone }),
        ...(appliedCoupon && { couponCode: appliedCoupon.code, couponId: appliedCoupon.id }),
        ...(discount > 0 && { discountApplied: discount }),
      });

      toast({
        title: 'Atendimento iniciado com sucesso!',
        description: `${values.responsible} e ${childrenArray.length} criança(s) deram entrada.`,
      });
      router.push('/active-children');

    } catch (error) {
      console.error('Failed to add session:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao iniciar atendimento',
        description: 'Não foi possível adicionar o novo atendimento. Tente novamente.',
      });
      setLoading(false);
    }
  }

  const pricePerChild = useMemo(() => {
    if (!settings) return 0;
    if (sessionType === 'fullAfternoon') return settings.fullAfternoonRate;
    if (contractedHours >= 1) {
        return settings.firstHourRate + (contractedHours - 1) * settings.additionalHourRate;
    }
    return 0;
  }, [settings, sessionType, contractedHours]);

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-2">
          <PartyPopper className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight font-headline">Novo Atendimento</h2>
        </div>
        <Card className="w-full max-w-4xl mx-auto hover:-translate-y-0 hover:shadow-sm">
          <CardHeader>
            <CardTitle>Informações do Atendimento</CardTitle>
            <CardDescription>Preencha os dados abaixo para iniciar um novo atendimento.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="responsible"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Responsável</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: João da Silva" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF do Responsável</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="000.000.000-00"
                            {...field}
                            onChange={(e) => field.onChange(formatCpf(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          {...field}
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="children"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome(s) da(s) Criança(s)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Maria, Pedro" {...field} />
                      </FormControl>
                      <FormDescription>
                        Se houver mais de uma, separe os nomes por vírgula. O valor será multiplicado.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 pt-4">

                  {/* Coluna Esquerda */}
                  <div className="space-y-6">
                    <Tabs defaultValue="hourly" onValueChange={(value) => setSessionType(value as any)} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="hourly">Por Hora</TabsTrigger>
                        <TabsTrigger value="fullAfternoon">Tarde Toda</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className={cn("space-y-3 transition-opacity", sessionType === 'fullAfternoon' && "opacity-50 pointer-events-none")}>
                      <FormLabel>Tempo Contratado</FormLabel>
                      <div className="flex items-center justify-center gap-8 py-4 border rounded-lg">
                        <Button variant="outline" size="icon" type="button" onClick={() => setContractedHours(h => Math.max(1, h - 1))} className="h-12 w-12 rounded-full">
                          <Minus className="h-6 w-6" />
                        </Button>
                        <div className="flex flex-col items-center gap-1 text-center">
                          <span className="text-5xl font-bold">{contractedHours}</span>
                          <Label className="text-sm text-muted-foreground font-normal">
                            {contractedHours > 1 ? 'Horas' : 'Hora'}
                          </Label>
                        </div>
                        <Button variant="outline" size="icon" type="button" onClick={() => setContractedHours(h => h + 1)} className="h-12 w-12 rounded-full">
                          <Plus className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="coupon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cupom de Desconto</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="Ex: FERIAS10" {...field} className="uppercase"/>
                            </FormControl>
                            <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={!couponCode || isLoadingCoupon}>
                              {isLoadingCoupon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />}
                              Aplicar
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Coluna Direita */}
                  <div className="space-y-4">
                    <Card className="bg-muted/50 shadow-inner hover:-translate-y-0 hover:shadow-inner">
                      <CardHeader className="pb-2 pt-4">
                          <CardTitle className="text-lg">Resumo do Valor</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-2 space-y-4 min-h-[130px]">
                        {!settings ? (
                           <div className="flex items-center justify-center h-full pt-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                           </div>
                        ) : (
                          <>
                            {discount > 0 && (
                              <>
                                <div className="flex justify-between items-center text-muted-foreground text-sm">
                                  <span>Subtotal</span>
                                  <span className="font-mono">{formatCurrency(basePrice)}</span>
                                </div>
                                <div className="flex justify-between items-center text-green-600 text-sm">
                                  <span>Desconto ({appliedCoupon?.code})</span>
                                  <span className="font-mono">- {formatCurrency(discount)}</span>
                                </div>
                                <Separator />
                              </>
                            )}
                            <div className="flex justify-between items-center text-primary">
                              <span className="text-xl font-semibold">Valor Total:</span>
                              <span className="text-3xl font-bold font-mono">{formatCurrency(totalPrice)}</span>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
                      <h4 className="font-semibold text-center">Detalhes do Contrato</h4>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span className="text-muted-foreground">Tempo da Sessão:</span>
                        <span className="font-medium">{totalDurationString}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nº de Crianças:</span>
                        <span className="font-medium">{childrenCount > 0 ? childrenCount : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor por Criança:</span>
                        <span className="font-medium">{settings && childrenCount > 0 ? formatCurrency(pricePerChild) : 'R$ --,--'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <Button type="submit" className="w-full" disabled={loading || !settings} size="lg">
                    {loading || !settings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PartyPopper className="mr-2 h-4 w-4" />}
                    {loading ? "Iniciando..." : !settings ? "Carregando Preços..." : "Iniciar Atendimento"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
