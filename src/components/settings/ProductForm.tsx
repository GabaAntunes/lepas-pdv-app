
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
import { Product } from "@/types";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const formatCurrencyForDisplay = (value: number | string | undefined | null): string => {
    if (value === null || value === undefined || value === '') return '';
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (isNaN(numericValue)) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
};

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  price: z.coerce.number().positive({ message: "O preço deve ser um número positivo." }),
  stock: z.coerce.number().int().min(0, { message: "O estoque não pode ser negativo." }),
  minStock: z.coerce.number().int().min(0, { message: "O estoque mínimo não pode ser negativo." }).optional(),
});

export type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [isPriceFocused, setIsPriceFocused] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      price: initialData.price,
      stock: initialData.stock,
      minStock: initialData.minStock || 0,
    } : {
      name: "",
      price: 0,
      stock: 0,
      minStock: 0,
    },
  });

  const handleFormSubmit = async (values: ProductFormValues) => {
    setLoading(true);
    await onSubmit(values);
    // Do not set loading to false here, the dialog will close
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Produto</FormLabel>
              <FormControl>
                <Input placeholder="Pipoca Pequena" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preço (R$)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="R$ 5,00"
                  onFocus={() => setIsPriceFocused(true)}
                  onBlur={() => {
                    field.onBlur();
                    setIsPriceFocused(false);
                  }}
                  value={isPriceFocused ? (field.value || '') : formatCurrencyForDisplay(field.value)}
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
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Estoque Atual</FormLabel>
                <FormControl>
                    <Input type="number" step="1" placeholder="100" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="minStock"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Estoque Mínimo</FormLabel>
                <FormControl>
                    <Input type="number" step="1" placeholder="10" {...field} />
                </FormControl>
                <FormDescription className="text-xs">Receba um alerta quando o estoque atingir este valor.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
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
