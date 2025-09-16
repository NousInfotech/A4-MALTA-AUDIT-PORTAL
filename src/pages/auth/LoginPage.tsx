// @ts-nocheck
// src/pages/auth/LoginPage.tsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Sparkles, ArrowRight, Lock, Mail, Key, Users, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = await login(email, password);
    
    if (success) {
      toast({
        title: "Login successful",
        description: "Welcome to AuditPortal!",
      });
      navigate(from, { replace: true });
    } else {
      setError('Invalid credentials or account not approved');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Sidebar - Dark Theme */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 relative overflow-hidden">
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center h-full p-12">
          <div className="text-center text-white space-y-8 max-w-lg">
            {/* Logo */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30">
                <img src="/logo.png" alt="Logo" className="h-14 w-14 object-cover rounded" />
              </div>
              <span className="text-3xl font-bold">Audit Portal</span>
        </div>

            <h1 className="text-5xl font-bold leading-tight">
              Welcome to
              <span className="block text-gray-300">
                Audit Portal
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 leading-relaxed">
              Streamline your audit processes with our modern platform designed for professionals.
            </p>
            
            {/* Feature Cards */}
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
          {/* Header */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="h-10 w-10 object-cover rounded" />
              </div>
              <span className="text-2xl font-bold text-gray-900">Audit Portal</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                Welcome back
              </h1>
              <p className="text-gray-600 text-lg">
                Sign in to your account
              </p>
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
                      <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                    className="h-12 pl-12 border-gray-200 focus:border-gray-400 rounded-lg"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                    className="h-12 pl-12 pr-12 border-gray-200 focus:border-gray-400 rounded-lg"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                className="w-full h-12 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Lock className="mr-2 h-5 w-5" />
                      )}
                      Sign In
                    </Button>
                  </form>
                  
            <div className="text-center pt-6 border-t border-gray-200">
                    <p className="text-gray-600">
                      Don't have an account?{' '}
                <Link to="/signup" className="text-gray-800 font-semibold hover:text-gray-900">
                        Sign up
                      </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};