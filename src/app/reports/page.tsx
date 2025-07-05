
'use client';

import { MainLayout } from '@/components/MainLayout';
import { ReportsDashboard } from '@/components/reports/ReportsDashboard';
import { BlurFade } from '@/components/magicui/blur-fade';

export default function ReportsPage() {
  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <BlurFade delay={0.15}>
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight font-headline">Relatórios e Análises</h2>
          </div>
        </BlurFade>
        <BlurFade delay={0.25}>
          <ReportsDashboard />
        </BlurFade>
      </div>
    </MainLayout>
  );
}
