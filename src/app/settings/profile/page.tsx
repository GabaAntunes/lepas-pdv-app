'use client';

import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { ProfileInfoForm } from '@/components/settings/ProfileInfoForm';
import { ProfileSecurityForm } from '@/components/settings/ProfileSecurityForm';
import { Separator } from '@/components/ui/separator';

export default function ProfileSettingsPage() {
  return (
    <div className="min-h-screen w-full bg-muted/40">
      <SettingsHeader title="Meu Perfil" showBackButton />
      <main className="p-6 md:p-8 grid gap-8 max-w-4xl mx-auto">
        <ProfileInfoForm />
        <Separator />
        <ProfileSecurityForm />
      </main>
    </div>
  );
}
