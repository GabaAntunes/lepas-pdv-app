'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function ProfileInfoForm() {
  const { user, updateUserProfile } = useAuth();
  const { toast } = useToast();
  
  const [isNameSaving, setIsNameSaving] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');

  // Sync local state if user context changes from outside
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  const handleNameBlur = async () => {
    if (!user || displayName === user.displayName) {
      return; // No changes to save
    }
    
    if (displayName.length < 2) {
      toast({ variant: 'destructive', title: 'Nome inválido', description: 'O nome deve ter pelo menos 2 caracteres.' });
      setDisplayName(user.displayName || ''); // Revert to original name
      return;
    }

    setIsNameSaving(true);
    try {
      await updateUserProfile({ displayName });
      toast({ title: 'Nome atualizado com sucesso!' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao atualizar o nome.' });
    } finally {
      setIsNameSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Perfil</CardTitle>
        <CardDescription>As alterações de nome são salvas automaticamente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
                <AvatarFallback className="text-2xl">{user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="space-y-2 w-full">
                <Label htmlFor="displayName">Nome de Exibição</Label>
                <div className="relative">
                    <Input 
                        id="displayName"
                        placeholder="Seu nome" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onBlur={handleNameBlur}
                        disabled={isNameSaving}
                    />
                    {isNameSaving && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                    )}
                </div>
            </div>
        </div>

        <div className="space-y-2">
          <Label>E-mail de Acesso</Label>
          <Input value={user?.email || ''} disabled />
        </div>
      </CardContent>
    </Card>
  );
}
