
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React, { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { SettingsHeader } from "@/components/settings/SettingsHeader";

const formatCurrencyForDisplay = (value: number | string | undefined | null): string => {
    if (value === null || value === undefined || value === '') return '';
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (isNaN(numericValue)) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
};

const formSchema = z.object({
  firstHourRate: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
  additionalHourRate: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
  fullAfternoonRate: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
});

export default function GeneralSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstHourRate: 30.00,
      additionalHourRate: 15.00,
      fullAfternoonRate: 50.00,
    },
  });
  
  useEffect(() => {
    async function fetchSettings() {
      setFetching(true);
      try {
        const settings = await getSettings();
        form.reset({
            firstHourRate: settings.firstHourRate,
            additionalHourRate: settings.additionalHourRate,
            fullAfternoonRate: settings.fullAfternoonRate,
        });
        if (settings.logoUrl) {
          setLogoPreview(settings.logoUrl);
        }
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
      // In a real app, you would upload `logoFile` to Firebase Storage,
      // get the download URL, and include it in the `updateSettings` call.
      // For this prototype, we'll just show a toast if a new logo is selected.
      if (logoFile) {
          toast({
              title: "Funcionalidade de Upload",
              description: "O upload de imagens não está implementado neste protótipo."
          })
      }

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

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <SettingsHeader title="Configurações Gerais" showBackButton />
      <main className="p-6">
        <Card className="max-w-4xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Regras de Negócio e Marca</CardTitle>
                <CardDescription>Defina os valores de cobrança e a identidade visual da sua empresa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {fetching ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-10 w-full" /></div>
                      <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-10 w-full" /></div>
                      <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <div className="flex items-center gap-6">
                            <Skeleton className="h-24 w-24 rounded-md" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-10 w-40" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="firstHourRate"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Valor da 1ª Hora</Label>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="R$ 30,00"
                                onFocus={() => setFocusedField(field.name)}
                                onBlur={() => { field.onBlur(); setFocusedField(null); }}
                                value={focusedField === field.name ? (field.value || '') : formatCurrencyForDisplay(field.value)}
                                onChange={(e) => field.onChange(e.target.value.replace(',', '.'))}
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
                            <Label>Valor Hora Adicional</Label>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="R$ 15,00"
                                onFocus={() => setFocusedField(field.name)}
                                onBlur={() => { field.onBlur(); setFocusedField(null); }}
                                value={focusedField === field.name ? (field.value || '') : formatCurrencyForDisplay(field.value)}
                                onChange={(e) => field.onChange(e.target.value.replace(',', '.'))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fullAfternoonRate"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Valor Tarde Toda</Label>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="R$ 50,00"
                                onFocus={() => setFocusedField(field.name)}
                                onBlur={() => { field.onBlur(); setFocusedField(null); }}
                                value={focusedField === field.name ? (field.value || '') : formatCurrencyForDisplay(field.value)}
                                onChange={(e) => field.onChange(e.target.value.replace(',', '.'))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div>
                      <Label>Logo da Empresa</Label>
                      <div className="mt-2 flex items-center gap-6">
                        <div className="w-24 h-24 rounded-md border-2 border-dashed flex items-center justify-center bg-muted">
                          {logoPreview ? (
                            <Image src={logoPreview} alt="Preview do Logo" width={96} height={96} className="object-contain rounded-md" />
                          ) : (
                            <span className="text-xs text-muted-foreground">Preview</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            id="logo-upload"
                            className="hidden"
                            accept="image/png, image/jpeg, image/svg+xml"
                            onChange={handleLogoChange}
                          />
                          <Label htmlFor="logo-upload" className="cursor-pointer">
                            <Button type="button" variant="outline" asChild>
                              <span><Upload className="mr-2 h-4 w-4" />Trocar Imagem</span>
                            </Button>
                          </Label>
                          <p className="text-xs text-muted-foreground mt-2">SVG, PNG, JPG. Recomendado: 200x200px.</p>
                        </div>
                      </div>
                    </div>
                  </>
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
      </main>
    </div>
  );
}
