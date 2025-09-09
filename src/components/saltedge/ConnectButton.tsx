// src/components/saltedge/ConnectButton.tsx
'use client';

import { useState } from 'react';


import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Landmark, ShieldCheck } from 'lucide-react';
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
    <>
      <Card className='mx-auto w-full max-w-4xl shadow-lg'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Landmark className='h-6 w-6' />
            <span>Connect Your Bank Account</span>
          </CardTitle>
          <CardDescription>
            Securely link your bank account using Salt Edge to continue.
            <span className='text-muted-foreground text-sm'>
              By connecting your account, you agree to grant read-only access.
              We will never have access to your credentials.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <ul className='space-y-4 text-sm'>
              <li className='flex items-center gap-2'>
                <ShieldCheck className='h-4 w-4 text-green-500' />
                <span>Bank-level security</span>
              </li>
              <li className='flex items-center gap-2'>
                <ShieldCheck className='h-4 w-4 text-green-500' />
                <span>Your data is encrypted</span>
              </li>
              <li className='flex items-center gap-2'>
                <ShieldCheck className='h-4 w-4 text-green-500' />
                <span>You can disconnect at any time</span>
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className='flex justify-end'>
          <button
            onClick={handleConnect}
            disabled={isButtonDisabled} // Use the new disabled state
            className='rounded bg-blue-500 px-4 py-2 text-white disabled:opacity-50'
          >
            {isLoading ? 'Connecting...' : 'Connect Your Bank'}
          </button>
        </CardFooter>
      </Card>
    </>
  );
}