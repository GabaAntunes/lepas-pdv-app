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
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }, [totalMinutes]);

  // Consolidated effect for all price calculations
  useEffect(() => {
    if (!settings || childrenCount <= 0) {
      setBasePrice(0);
      setDiscount(0);
      setTotalPrice(0);
      return;
    }

    // 1. Calculate base price based on contracted hours
    const basePriceForFirstHour = settings.firstHourRate * childrenCount;
    const basePriceForAdditionalHours = (Math.max(0, contractedHours - 1)) * settings.additionalHourRate * childrenCount;
    const newBasePrice = basePriceForFirstHour + basePriceForAdditionalHours;
    setBasePrice(newBasePrice);
    
    // 2. Calculate discount based on applied coupon. Discount only applies to the first hour.
    let newDiscount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'percentage') {
        newDiscount = basePriceForFirstHour * (appliedCoupon.discountValue / 100);
      } else if (appliedCoupon.discountType === 'fixed') {
        newDiscount = appliedCoupon.discountValue;
      } else if (appliedCoupon.discountType === 'freeTime') {
        // FreeTime coupons are only valid for 1 contracted hour.
        // The other useEffect will remove the coupon if hours > 1, so discount will become 0.
        if (contractedHours === 1) {
          const costPerMinute = settings.firstHourRate / 60;
          const discountFromTime = costPerMinute * appliedCoupon.discountValue;
          const discountPerChild = Math.min(discountFromTime, settings.firstHourRate);
          newDiscount = discountPerChild * childrenCount;
        }
      }
    }
    setDiscount(newDiscount);

    // 3. Calculate final total price
    setTotalPrice(Math.max(0, newBasePrice - newDiscount));
  }, [contractedHours, childrenCount, settings, appliedCoupon]);


  useEffect(() => {
    if (appliedCoupon?.discountType === 'freeTime' && contractedHours > 1) {
      toast({
        variant: 'destructive',
        title: 'Cupom de Tempo Inválido',
        description: 'Cupons de tempo grátis são válidos apenas para a contratação de 1 hora. O cupom foi removido.',
      });
      setAppliedCoupon(null);
      form.setValue('coupon', '');
    }
  }, [contractedHours, appliedCoupon, form, toast]);


  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsLoadingCoupon(true);
    setAppliedCoupon(null); // Reset previous coupon
    try {
      const coupon = await getCouponByCode(couponCode);
      if (coupon && coupon.status === 'active') {
        if (coupon.discountType === 'freeTime' && contractedHours > 1) {
          toast({
            variant: 'destructive',
            title: 'Cupom não aplicável',
            description: 'Cupons de tempo grátis só podem ser aplicados na contratação de 1 hora.',
          });
          form.setValue('coupon', '');
        } else {
          setAppliedCoupon(coupon);
          let description = '';
          if (coupon.discountType === 'fixed') {
              description = `Desconto de ${formatCurrency(coupon.discountValue)} aplicado.`;
          } else if (coupon.discountType === 'percentage') {
              description = `Desconto de ${coupon.discountValue}% aplicado na primeira hora.`;
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
      
      await addActiveSession({
        responsible: values.responsible,
        responsibleCpf: values.cpf,
        children: childrenArray,
        maxTime: totalMinutes,
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

  const pricePerChild = settings && contractedHours >= 1
    ? settings.firstHourRate + (contractedHours - 1) * settings.additionalHourRate
    : 0;

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
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
                    <div className="space-y-3">
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
                        <span className="text-muted-foreground">Tempo Total da Sessão:</span>
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
