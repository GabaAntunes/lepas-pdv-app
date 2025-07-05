
"use client";

import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { AuthContextProvider, useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, CircleDashed } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const FirebaseConfigNeeded = () => (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
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
            Depois de salvar suas credenciais no arquivo, recarregue esta página.
            </p>
        </CardContent>
        </Card>
    </div>
);


const AuthGate = ({ children }: { children: ReactNode }) => {
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isFirebaseConfigured || loading) return;

    const isAuthPage = pathname === '/login';

    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user && isAuthPage) {
      router.push('/');
    }
  }, [user, loading, router, pathname, isFirebaseConfigured]);

  if (!isFirebaseConfigured) {
      return <FirebaseConfigNeeded />;
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <CircleDashed className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && pathname !== '/login') {
    return null; 
  }

  if (user && pathname === '/login') {
    return null;
  }

  return <>{children}</>;
};


export function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <AuthContextProvider>
            <AuthGate>{children}</AuthGate>
        </AuthContextProvider>
    )
}
