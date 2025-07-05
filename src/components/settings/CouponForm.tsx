
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Coupon } from "@/types";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { nanoid } from 'nanoid';

const formatCurrencyForDisplay = (value: number | string | undefined | null): string => {
    if (value === null || value === undefined || value === '') return '';
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (isNaN(numericValue)) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
};

const formSchema = z.object({
  code: z.string().min(3, { message: "O código deve ter pelo menos 3 caracteres." }).transform(v => v.toUpperCase()),
  discountType: z.enum(['percentage', 'fixed', 'freeTime']),
  discountValue: z.coerce.number().positive({ message: "O valor do desconto deve ser positivo." }),
  status: z.enum(['active', 'inactive']),
  validUntil: z.date().optional(),
  usageLimit: z.coerce.number().int().min(0, { message: "O limite de usos não pode ser negativo." }).optional(),
});

export type CouponFormValues = z.infer<typeof formSchema>;

interface CouponFormProps {
  initialData?: Coupon;
  onSubmit: (values: CouponFormValues) => Promise<void>;
  onCancel: () => void;
}

export function CouponForm({ initialData, onSubmit, onCancel }: CouponFormProps) {
  const [loading, setLoading] = useState(false);
  const [isDiscountValueFocused, setIsDiscountValueFocused] = useState(false);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
        ...initialData,
        code: initialData.code.toUpperCase(),
        validUntil: initialData.validUntil ? new Date(initialData.validUntil) : undefined,
        usageLimit: initialData.usageLimit ?? 0,
    } : {
      code: "",
      discountType: 'percentage',
      discountValue: 10,
      status: 'active',
      usageLimit: 0,
    },
  });

  const discountType = form.watch('discountType');

  const handleFormSubmit = async (values: CouponFormValues) => {
    setLoading(true);
    await onSubmit(values);
    // The dialog will close, so don't setLoading(false)
  };
  
  const generateRandomCode = () => {
    form.setValue('code', nanoid(8).toUpperCase(), { shouldValidate: true });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código do Cupom</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="FERIAS10" {...field} />
                </FormControl>
                <Button type="button" variant="outline" onClick={generateRandomCode}><Sparkles className="mr-2 h-4 w-4" /> Gerar</Button>
              </div>
              <FormDescription>Clientes usarão este código. Não diferencia maiúsculas de minúsculas.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Desconto</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    <SelectItem value="freeTime">Tempo Grátis (Minutos)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="discountValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={discountType === 'fixed' ? 'R$ 10,00' : '10'}
                    onFocus={() => setIsDiscountValueFocused(true)}
                    onBlur={() => {
                        field.onBlur();
                        setIsDiscountValueFocused(false);
                    }}
                    value={
                        discountType === 'fixed' && !isDiscountValueFocused
                        ? formatCurrencyForDisplay(field.value)
                        : (field.value || '')
                    }
                    onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9,.]/g, '').replace(',', '.');
                        field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Data de Validade</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP", { locale: ptBR })
                            ) : (
                                <span>Não expira</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormDescription>
                        Deixe em branco se o cupom não expirar.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="usageLimit"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Limite de Usos</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                        </FormControl>
                        <FormDescription>
                           0 para usos ilimitados.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Status</FormLabel>
                <FormDescription>
                  Cupons ativos podem ser usados.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value === 'active'}
                  onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
        </div>
      </form>
    </Form>
  );
}
