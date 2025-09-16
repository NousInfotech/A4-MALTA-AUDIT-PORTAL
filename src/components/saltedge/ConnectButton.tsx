// src/components/saltedge/ConnectButton.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Landmark, ShieldCheck, Zap, Lock } from 'lucide-react';
import { createConnectSession } from '@/lib/api/saltedge';
import { useAuth } from '@/contexts/AuthContext';

export default function ConnectButton() {
  const [isLoading, setIsLoading] = useState(false);
  // Destructure user and authLoading as well
  const { refreshUser, user, isLoading: authLoading } = useAuth();

  const handleConnect = async () => {
    // Add a check here for user
    if (!user) {
      console.error('No authenticated user to connect bank for.');
      alert('You must be logged in to connect your bank account.');
      return;
    }

    setIsLoading(true);
    try {
      // Safely access user.role now that we've checked if user exists
      // const returnTo = `${window.location.origin}/${user.role}/salt-edge/callback`;
      const returnTo = `${window.location.origin}/employee/salt-edge/callback`;

      const session = await createConnectSession(returnTo);
      console.log(session);

      await refreshUser();

      window.open(session.connect_url, '_blank');
    } catch (error) {
      console.error('Failed to create connect session:', error);
      alert('Failed to connect to bank');
    } finally {
      setIsLoading(false);
    }
  };

  // The button should be disabled if auth is loading or no user is logged in
  const isButtonDisabled = isLoading || authLoading || !user;

  return (
    <Card className="group bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-gray-300 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-gray-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <CardHeader className="relative pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
            <Landmark className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors duration-300">
              Connect Your Bank Account
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2 text-lg">
              Securely link your bank account using Salt Edge to continue. By connecting your account, you agree to grant read-only access. We will never have access to your credentials.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Bank-level security</p>
              <p className="text-sm text-gray-600">PCI DSS compliant</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Your data is encrypted</p>
              <p className="text-sm text-gray-600">End-to-end protection</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">You can disconnect at any time</p>
              <p className="text-sm text-gray-600">Full control</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
          <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 rounded-xl px-4 py-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Secure Integration
          </Badge>
          <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 rounded-xl px-4 py-2 text-sm font-semibold">
            <Lock className="h-4 w-4 mr-2" />
            Read-Only Access
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="relative flex justify-center pt-6">
        <Button
          onClick={handleConnect}
          disabled={isButtonDisabled}
          className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-4 h-auto text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-105"
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
              Connecting...
            </>
          ) : (
            <>
              <Landmark className="h-5 w-5 mr-3" />
              Connect Your Bank
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}