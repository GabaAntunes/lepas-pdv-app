'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log o erro para um serviço de relatórios de erros
    console.error(error);
  }, [error]);

  const isFirebaseConfigError = error.message.includes('A configuração do Firebase está incompleta');

  return (
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
          {isFirebaseConfigError ? (
            <Card className="w-full max-w-2xl border-destructive">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-destructive font-headline text-2xl">
                      Configuração do Firebase Incompleta
                    </CardTitle>
                    <CardDescription>
                      Para o aplicativo funcionar, ele precisa se conectar ao seu projeto Firebase.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div>
                    <h3 className="mb-2 font-semibold">Como resolver:</h3>
                    <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                        <ol className="list-decimal list-inside space-y-2">
                            <li>
                                No painel de arquivos, encontre o arquivo chamado{' '}
                                <code className="font-code rounded bg-muted px-1.5 py-1">.env.local.example</code>.
                            </li>
                            <li>
                                Renomeie esse arquivo para{' '}
                                <code className="font-code rounded bg-muted px-1.5 py-1">.env.local</code>.
                            </li>
                            <li>
                                Abra o arquivo{' '}
                                <code className="font-code rounded bg-muted px-1.5 py-1">.env.local</code> e cole suas credenciais do Firebase.
                            </li>
                        </ol>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Depois de salvar suas credenciais no arquivo, clique no botão abaixo para tentar novamente.
                </p>
                <Button onClick={() => reset()} className="w-full">
                  <RotateCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Ocorreu um Erro</CardTitle>
                <CardDescription>
                  Algo deu errado. Você pode tentar recarregar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => reset()}>Tentar Novamente</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </body>
    </html>
  );
}
