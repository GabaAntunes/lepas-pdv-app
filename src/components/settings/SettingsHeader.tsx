'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';

interface SettingsHeaderProps {
  title: string;
  showBackButton?: boolean;
}

export function SettingsHeader({ title, showBackButton = false }: SettingsHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Link href="/settings">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Button>
          </Link>
        )}
        <h1 className="text-xl font-semibold font-headline">{title}</h1>
      </div>
      <Link href="/">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </Button>
      </Link>
    </header>
  );
}
