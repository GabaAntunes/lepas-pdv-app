
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, CheckCircle, Circle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  password: z.string()
    .min(8, { message: "A senha deve ter no mínimo 8 caracteres." })
    .regex(/[a-z]/, { message: "A senha deve conter pelo menos uma letra minúscula."})
    .regex(/[A-Z]/, { message: "A senha deve conter pelo menos uma letra maiúscula."})
    .regex(/[0-9]/, { message: "A senha deve conter pelo menos um número."})
    .regex(/[^a-zA-Z0-9]/, { message: "A senha deve conter pelo menos um caractere especial."}),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
});

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const password = form.watch("password") ?? "";

  const passwordCriteria = [
      { id: 'length', text: "Mínimo de 8 caracteres", regex: /.{8,}/ },
      { id: 'lowercase', text: "Pelo menos uma letra minúscula", regex: /[a-z]/ },
      { id: 'uppercase', text: "Pelo menos uma letra maiúscula", regex: /[A-Z]/ },
      { id: 'number', text: "Pelo menos um número", regex: /[0-9]/ },
      { id: 'special', text: "Pelo menos um caractere especial", regex: /[^a-zA-Z0-9]/ },
  ];

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await signup(values.email, values.password);
      toast({
        title: "Conta criada com sucesso!",
        description: "Você será redirecionado em breve.",
      });
      // AuthProvider will handle redirect on user state change.
    } catch (error: any) {
        let description = "Ocorreu um erro ao criar sua conta.";
        if (error.code === 'auth/email-already-in-use') {
            description = "Este e-mail já está em uso por outra conta.";
        }
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="admin@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    {...field}
                    className="pr-10"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...field}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
            <div className="space-y-1">
                {passwordCriteria.map((criterion) => {
                    const isMet = criterion.regex.test(password);
                    return (
                        <div key={criterion.id} className={`flex items-center text-xs transition-colors ${isMet ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {isMet ? <CheckCircle className="h-3.5 w-3.5 mr-2" /> : <Circle className="h-3.5 w-3.5 mr-2" />}
                            <span>{criterion.text}</span>
                        </div>
                    )
                })}
            </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar Conta
        </Button>
      </form>
    </Form>
  );
}
