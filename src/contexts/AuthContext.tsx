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
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      setIsLoading(false);
      return false;
    }

    // Check if user is approved
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('user_id', data.user.id)
      .single();

    setIsLoading(false);
    return profile?.status === 'approved';
  };

  const signup = async (userData: Partial<User> & { password: string }): Promise<boolean> => {
    setIsLoading(true);
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email: userData.email!,
      password: userData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: userData.name,
          role: userData.role,
          company_name: userData.companyName,
          company_number: userData.companyNumber,
          industry: userData.industry
        }
      }
    });

    setIsLoading(false);
    
    if (error) {
      return false;
    }

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