"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  LineChart,
  Settings,
  Menu,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { UserNav } from './UserNav';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './theme/ThemeToggle';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

const navItems = [
  { href: '/', label: 'Início', icon: <LayoutDashboard className="h-5 w-5 shrink-0" /> },
  { href: '/active-children', label: 'Crianças', icon: <Users className="h-5 w-5 shrink-0" /> },
  { href: '/reports', label: 'Relatórios', icon: <LineChart className="h-5 w-5 shrink-0" /> },
  { href: '/settings', label: 'Configurações', icon: <Settings className="h-5 w-5 shrink-0" /> },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 font-body">
      {/* Header for both Mobile and Desktop */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-4">
          <Logo />
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden flex-1 items-center justify-center md:flex">
            <div className="inline-flex items-center gap-6 text-sm font-medium">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        data-active={pathname === item.href}
                        className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground data-[active=true]:text-primary data-[active=true]:font-semibold"
                    >
                    {item.icon}
                    {item.label}
                    </Link>
                ))}
            </div>
        </nav>
        
        {/* Right side controls (Desktop) */}
        <div className="hidden items-center gap-2 md:flex">
            <NotificationBell />
            <ThemeToggle />
            <UserNav />
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
            <Sheet>
                <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menu</span>
                </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col">
                    <Logo />
                    <nav className="grid gap-4 text-lg font-medium mt-8 flex-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                data-active={pathname === item.href}
                                className="flex items-center gap-4 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-primary data-[active=true]:bg-muted data-[active=true]:text-primary"
                            >
                            {item.icon}
                            {item.label}
                            </Link>
                        ))}
                    </nav>
                     <div className="mt-auto flex items-center justify-between rounded-lg border p-3">
                        <UserNav />
                        <div className='flex items-center gap-2'>
                            <NotificationBell />
                            <ThemeToggle />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
      </header>
      
      <main className="flex-1" key={pathname}>
        {children}
      </main>
    </div>
  );
}
