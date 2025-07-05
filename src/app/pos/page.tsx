
'use client';

import { CircleDashed } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page is a fallback. Normally, users should be directed to /pos/[id].
// If they land here, redirect them to a safe place.
export default function PosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/active-children');
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <CircleDashed className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}
