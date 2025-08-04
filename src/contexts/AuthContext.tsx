import React, { createContext, useContext, useState, useEffect } from 'react';

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

// Mock users data
const mockUsers: (User & { password: string })[] = [
  {
    id: '1',
    email: 'admin@auditportal.com',
    password: 'admin123',
    name: 'System Administrator',
    role: 'admin',
    status: 'approved',
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    email: 'auditor@company.com',
    password: 'auditor123',
    name: 'John Auditor',
    role: 'employee',
    status: 'approved',
    createdAt: '2024-01-02'
  },
  {
    id: '3',
    email: 'client@company.com',
    password: 'client123',
    name: 'Jane Client',
    role: 'client',
    status: 'approved',
    createdAt: '2024-01-03',
    companyName: 'Tech Solutions Ltd',
    companyNumber: 'TC123456',
    industry: 'Technology'
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth
    const storedUser = localStorage.getItem('auditPortalUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    
    if (foundUser && foundUser.status === 'approved') {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('auditPortalUser', JSON.stringify(userWithoutPassword));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const signup = async (userData: Partial<User> & { password: string }): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === userData.email);
    if (existingUser) {
      setIsLoading(false);
      return false;
    }
    
    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email: userData.email!,
      password: userData.password,
      name: userData.name!,
      role: userData.role!,
      status: userData.role === 'employee' ? 'pending' as const : 'approved' as const,
      createdAt: new Date().toISOString(),
      ...(userData.role === 'client' && {
        companyName: userData.companyName,
        companyNumber: userData.companyNumber,
        industry: userData.industry
      })
    };
    
    mockUsers.push(newUser);
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auditPortalUser');
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