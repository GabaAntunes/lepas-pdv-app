'use client';

import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Settings as SettingsIcon, Package, Ticket, Banknote } from 'lucide-react';
import Link from 'next/link';
import { BlurFade } from '@/components/magicui/blur-fade';

const settingsCards = [
  {
    title: 'Geral',
    description: 'Ajuste preços e identidade visual.',
    href: '/settings/general',
    icon: SettingsIcon,
    color: 'text-blue-500',
  },
  {
    title: 'Produtos',
    description: 'Gerencie seu catálogo de produtos.',
    href: '/settings/products',
    icon: Package,
    color: 'text-orange-500',
  },
  {
    title: 'Cupons',
    description: 'Crie e administre cupons de desconto.',
    href: '/settings/coupons',
    icon: Ticket,
    color: 'text-green-500',
  },
  {
    title: 'Caixa',
    description: 'Opere abertura, sangria e fechamento.',
    href: '/settings/cash-register',
    icon: Banknote,
    color: 'text-purple-500',
  },
];

export default function SettingsHubPage() {
  return (
    <div className="min-h-screen w-full bg-muted/40">
      <SettingsHeader title="Configurações" />
      <main className="p-6 md:p-8">
        <BlurFade delay={0.15}>
          <p className="text-muted-foreground">Selecione uma área para configurar.</p>
        </BlurFade>
        
        <div className="grid gap-6 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {settingsCards.map((card, index) => (
            <BlurFade key={card.href} delay={0.25 + index * 0.1}>
              <Link href={card.href} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
                <Card className="group hover:border-primary transition-all h-full">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <card.icon className={`h-8 w-8 mb-4 ${card.color}`} />
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                    <CardTitle className="font-headline text-xl">{card.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{card.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </BlurFade>
          ))}
        </div>
      </main>
    </div>
  );
}
