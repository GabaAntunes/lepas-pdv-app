
'use client';

import { MainLayout } from '@/components/MainLayout';
import { ActiveSessions } from '@/components/active-children/ActiveSessions';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { BlurFade } from '@/components/magicui/blur-fade';
import Link from 'next/link';

export default function ActiveChildrenPage() {
  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <BlurFade delay={0.15}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight font-headline">Crianças Ativas</h2>
              <p className="text-muted-foreground">Monitore e gerencie todos os atendimentos em andamento.</p>
            </div>
            <div className="flex items-center space-x-2">
               <Link href="/new-session">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Atendimento
                </Button>
              </Link>
            </div>
          </div>
        </BlurFade>
        
        <BlurFade delay={0.25}>
          <ActiveSessions />
        </BlurFade>
      </div>
    </MainLayout>
  );
}
