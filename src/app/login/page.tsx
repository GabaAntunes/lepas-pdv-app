
"use client";

import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Logo } from '@/components/Logo';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [isLoginView, setIsLoginView] = useState(true);

  const toggleView = () => setIsLoginView(prev => !prev);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && (event.key === 'l' || event.key === 'L')) {
        event.preventDefault();
        toggleView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">
              {isLoginView ? 'Bem-vindo de volta!' : 'Crie sua Conta Admin'}
            </CardTitle>
            <CardDescription>
              {isLoginView ? 'Faça login para acessar o PDV.' : 'O primeiro usuário registrado será o administrador.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoginView ? <LoginForm /> : <RegisterForm />}
          </CardContent>
          <CardFooter className="flex-col gap-4 border-t pt-6">
             <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        {isLoginView ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                    </span>
                </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={toggleView}
            >
              {isLoginView ? 'Criar uma nova conta' : 'Fazer Login'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
