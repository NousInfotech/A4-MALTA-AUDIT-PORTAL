// @ts-nocheck
// src/pages/auth/LoginPage.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Sparkles, ArrowRight, Lock, Mail, Key, Users, CheckCircle, Shield, Smartphone, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserSettings } from '@/services/settingsService';
import { validate2FA } from '@/services/authService';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [sessionWarning, setSessionWarning] = useState<{ show: boolean; minutesLeft: number }>({ show: false, minutesLeft: 0 });

  const { login, isLoading } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || '/';
  const logoUrl = branding?.logo_url || '/logo.png';
  const orgName = branding?.organization_name || 'Audit Portal';
  const orgSubname = branding?.organization_subname || 'AUDIT & COMPLIANCE';

  // Session timeout check
  useEffect(() => {
    const checkSessionTimeout = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + 30 * 60 * 1000;
          const now = Date.now();
          const minutesLeft = Math.max(0, Math.floor((expiresAt - now) / 60000));

          if (minutesLeft <= 5 && minutesLeft > 0) {
            setSessionWarning({ show: true, minutesLeft });
          } else if (minutesLeft <= 0) {
            setSessionWarning({ show: true, minutesLeft: 0 });
            toast({
              title: "Session Expired",
              description: "Your session has expired. Please log in again.",
              variant: "destructive",
            });
          } else {
            setSessionWarning({ show: false, minutesLeft: 0 });
          }
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    };

    const interval = setInterval(checkSessionTimeout, 60000);
    checkSessionTimeout();
    return () => clearInterval(interval);
  }, [toast]);

  const handleVerify2FA = async () => {
    if (!twoFactorToken.trim() || twoFactorToken.length !== 6) {
      toast({
        title: "Invalid Token",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setVerifying2FA(true);
    try {
      const result = await validate2FA(twoFactorToken);

      if (result.valid) {
        toast({
          title: "Verified",
          description: "2FA verification successful",
        });
        setShow2FA(false);
        setTwoFactorToken('');
        navigate(from, { replace: true });
      } else {
        throw new Error("Invalid code");
      }
    } catch (e: any) {
      toast({
        title: "Verification Failed",
        description: e.message || "Invalid token",
        variant: "destructive",
      });
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleRefreshSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
        setSessionWarning({ show: false, minutesLeft: 0 });
        toast({
          title: "Session Refreshed",
          description: "Your session has been extended",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh session",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = await login(email, password);

    if (success) {
      try {
        const settings = await getUserSettings();
        if (settings.security && settings.security.twoFactorEnabled) {
          setShow2FA(true);
        } else {
          navigate(from, { replace: true });
        }
      } catch (err) {
        // Fallback or safe enter
        navigate(from, { replace: true });
      }
    } else {
      setError('Invalid credentials or account not approved');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Sidebar - Dark Theme */}
      <div className="hidden lg:flex w-1/2 bg-brand-sidebar relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-center h-full p-12">
          <div className="text-center text-white space-y-8 max-w-lg">

            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30">
                <img src={logoUrl} alt="Logo" className="h-14 w-14 object-cover rounded" />
              </div>
              <div className="text-left">
                <span className="text-3xl font-bold block">{orgName}</span>
                <span className="text-xs font-medium uppercase tracking-wider opacity-70 block">{orgSubname}</span>
              </div>
            </div>

            <h1 className="text-5xl font-bold leading-tight">
              Welcome to <span className="block text-gray-300">{orgName}</span>
            </h1>

            <p className="text-xl text-gray-300 leading-relaxed">
              Streamline your audit processes with our modern platform designed for professionals.
            </p>

            <div className="grid grid-cols-1 gap-4 mt-12">
              <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Smart Automation</h3>
                    <p className="text-gray-300 text-sm">AI-powered audit procedures</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Team Collaboration</h3>
                    <p className="text-gray-300 text-sm">Seamless team coordination</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Right Section - Light Theme */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
        <div className="relative w-full max-w-md space-y-8">

          <div className="space-y-6 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <img src={logoUrl} alt="Logo" className="h-10 w-10 object-cover rounded" />
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900 block">{orgName}</span>
                <span className="text-xs font-medium uppercase tracking-wider text-gray-600">{orgSubname}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-brand-body leading-tight">Welcome back</h1>
              <p className="text-gray-600 text-lg">Sign in to your account</p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-12 pl-12 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 pl-12 pr-12 rounded-lg"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Link to="/auth/forgot-password" className="text-sm font-medium text-primary hover:text-primary/90">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lock className="mr-2 h-5 w-5" />}
                Sign In
              </Button>
            </form>
          </div>

          {sessionWarning.show && (
            <Alert className="mt-4 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Session Timeout Warning</AlertTitle>
              <AlertDescription className="text-yellow-700">
                {sessionWarning.minutesLeft > 0 ? (
                  <>Your session will expire in {sessionWarning.minutesLeft} minute{sessionWarning.minutesLeft !== 1 ? "s" : ""}. Click refresh to extend.</>
                ) : "Your session has expired."}
              </AlertDescription>
              {sessionWarning.minutesLeft > 0 && (
                <Button size="sm" onClick={handleRefreshSession} className="mt-2">
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh Session
                </Button>
              )}
            </Alert>
          )}

        </div>
      </div>

      {/* 2FA Dialog */}
      <Dialog open={show2FA} onOpenChange={setShow2FA}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <DialogTitle>Two-Factor Authentication Required</DialogTitle>
            </div>
            <DialogDescription>
              Please verify your identity with 2FA to complete login
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Button variant="default" className="w-full flex justify-between items-center" disabled>
              <span className="flex items-center"><Smartphone className="h-4 w-4 mr-2" /> Authenticator App</span>
              <CheckCircle className="h-4 w-4" />
            </Button>

            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center tracking-widest text-lg"
              />
            </div>

            <Button
              onClick={handleVerify2FA}
              disabled={verifying2FA || twoFactorToken.length !== 6}
              className="w-full"
            >
              {verifying2FA ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
              Verify
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};