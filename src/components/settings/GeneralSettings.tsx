
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

const formatCurrencyForDisplay = (value: number | string | undefined | null): string => {
    if (value === null || value === undefined || value === '') return '';
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (isNaN(numericValue)) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
};

const formSchema = z.object({
  firstHourRate: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
  additionalHourRate: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
});

export function GeneralSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstHourRate: 30.00,
      additionalHourRate: 15.00,
    },
  });
  
  useEffect(() => {
    async function fetchSettings() {
      setFetching(true);
      try {
        const settings = await getSettings();
        form.reset(settings);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar configurações",
        });
      } finally {
        setFetching(false);
      }
    }
    fetchSettings();
  }, [form, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await updateSettings(values);
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar configurações",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="font-headline">Configurações Gerais</CardTitle>
            <CardDescription>Ajuste os valores de cobrança do seu parque.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fetching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-10 w-full" />
                  </div>
                   <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-10 w-full" />
                  </div>
              </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstHourRate"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Valor da 1ª Hora (R$)</Label>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="R$ 30,00"
                          onFocus={() => setFocusedField(field.name)}
                          onBlur={() => {
                              field.onBlur();
                              setFocusedField(null);
                          }}
                          value={focusedField === field.name ? (field.value || '') : formatCurrencyForDisplay(field.value)}
                          onChange={(e) => {
                              const value = e.target.value.replace(',', '.');
                              field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalHourRate"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Valor Hora Adicional (R$)</Label>
                      <FormControl>
                        <Input
                           type="text"
                           placeholder="R$ 15,00"
                           onFocus={() => setFocusedField(field.name)}
                           onBlur={() => {
                               field.onBlur();
                               setFocusedField(null);
                           }}
                           value={focusedField === field.name ? (field.value || '') : formatCurrencyForDisplay(field.value)}
                           onChange={(e) => {
                               const value = e.target.value.replace(',', '.');
                               field.onChange(value);
                           }}
                        />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={loading || fetching}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
