// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'employee' | 'client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  companyName?: string; // for clients
  companyNumber?: string; // for clients
  industry?: string; // for clients
  summary?: string; // for clients
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  signup: (userData: Partial<User> & { password: string }) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const getCurrentSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    setSession(session);

    if (session?.user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profile && !error) {
        const userData: User = {
          id: profile.user_id,
          email: session.user.email!,
          name: profile.name,
          role: profile.role as UserRole,
          status: profile.status as 'pending' | 'approved' | 'rejected',
          createdAt: profile.created_at,
          companyName: profile.company_name,
          companyNumber: profile.company_number,
          industry: profile.industry,
          summary:       profile.company_summary,
        };
        setUser(userData);
      } else {
        setUser(null); // Profile fetch failed
      }
    }

    setIsLoading(false);
  };

  getCurrentSession();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    getCurrentSession(); // Re-fetch session/profile
  });

  return () => subscription.unsubscribe();
}, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    // 1) Sign in and grab the session & user
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      setIsLoading(false);
      return false;
    }

    // 2) Immediately populate context
    setSession(data.session);
    
    // 3) Fetch the full profile row
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (profileError || !profile) {
      setIsLoading(false);
      return false;
    }

    setUser({
      id:            profile.user_id,
      email:         data.user.email!,
      name:          profile.name,
      role:          profile.role as UserRole,
      status:        profile.status as 'pending'|'approved'|'rejected',
      createdAt:     profile.created_at,
      companyName:   profile.company_name ?? undefined,
      companyNumber: profile.company_number ?? undefined,
      industry:      profile.industry ?? undefined,
      summary:       profile.company_summary ?? undefined,
    });

    setIsLoading(false);
    return true;
  };

  const signup = async (userData: {
    name: string
    email: string
    password: string
    role: UserRole
    companyName?: string
    companyNumber?: string
    industry?: string
    summary?: string
  }): Promise<boolean> => {
    setIsLoading(true);

    // 1) create the auth user
    const { data: signUpData, error: signUpError } =
      await supabase.auth.signUp({
        email:    userData.email!,
        password: userData.password,
        // no more options.data → we handle profiles manually
      });
    if (signUpError || !signUpData.user) {
      setIsLoading(false);
      return false;
    }

    // 2) upsert into your public.profiles table
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id:         signUpData.user.id,
          name:            userData.name,
          role:            userData.role,
          status:          'pending',
          company_name:    userData.companyName   || null,
          company_number:  userData.companyNumber || null,
          industry:        userData.industry      || null,
          company_summary: userData.summary       || null,
        },
        { onConflict: 'user_id' }          // ← merge with any pre-existing row
      );

    if (upsertError) {
      console.error('profiles upsert failed:', upsertError);
      // you can still return true if you want the user to proceed
    }

    setIsLoading(false);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};