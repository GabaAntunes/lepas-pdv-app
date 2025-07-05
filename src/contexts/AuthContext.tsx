"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, storage, isFirebaseConfigured } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  login: (email: string, pass: string) => Promise<any>;
  signup: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: { displayName?: string; }) => Promise<void>;
  reauthenticateAndChangePassword: (currentPass: string, newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const login = (email: string, pass: string) => {
    if (!isFirebaseConfigured || !auth) {
        return Promise.reject(new Error("A configuração do Firebase está incompleta."));
    }
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = (email: string, pass: string) => {
    if (!isFirebaseConfigured || !auth) {
      return Promise.reject(new Error("A configuração do Firebase está incompleta."));
    }
    return createUserWithEmailAndPassword(auth, email, pass);
  }

  const logout = async () => {
    if (!isFirebaseConfigured || !auth) return;
    await firebaseSignOut(auth);
    router.push('/login');
  };
  
  const updateUserProfile = async (updates: { displayName?: string; }) => {
    if (!auth?.currentUser || !storage) {
      throw new Error("Usuário não autenticado ou storage não configurado.");
    }

    const { displayName } = updates;
    const profileUpdates: { displayName?: string; } = {};

    if (displayName !== undefined) {
      profileUpdates.displayName = displayName;
    }
    
    // Only call updateProfile if there's something to update
    if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(auth.currentUser, profileUpdates);
        
        // After updating the profile, the local user object is stale.
        // We create a shallow copy of the updated currentUser to ensure React
        // detects a state change and re-renders consumers of this context.
        if (auth.currentUser) {
          const refreshedUser = Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser);
          setUser(refreshedUser);
        }
    }
  };

  const reauthenticateAndChangePassword = async (currentPass: string, newPass: string) => {
    if (!auth?.currentUser || !auth.currentUser.email) {
      throw new Error("Usuário não autenticado.");
    }
    
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPass);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, isFirebaseConfigured, updateUserProfile, reauthenticateAndChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
