import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee' as UserRole,
    companyName: '',
    companyNumber: '',
    industry: '',
    summary: ''
  });
  const [error, setError] = useState('');
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.role === 'client' && (!formData.companyName || !formData.companyNumber)) {
      setError('Company information is required for client accounts');
      return;
    }

    const success = await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      companyName: formData.companyName,
      companyNumber: formData.companyNumber,
      industry: formData.industry
    });
    
    if (success) {
      toast({
        title: "Account created successfully",
        description: formData.role === 'admin'
          ? "Admin account created successfully. You can now sign in."
          : "Your account is pending admin approval. You will receive an email when approved."
      });
      navigate('/login');
    } else {
      setError('Email already exists or signup failed. Please try again.');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join AuditPortal to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Create a password"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Account Type</Label>
              <Select value={formData.role} onValueChange={(value: UserRole) => handleChange('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee (Auditor)</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.role === 'client' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="Enter company name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyNumber">Company Number</Label>
                  <Input
                    id="companyNumber"
                    value={formData.companyNumber}
                    onChange={(e) => handleChange('companyNumber', e.target.value)}
                    placeholder="Enter company registration number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    placeholder="Enter industry"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="summary">Company Summary</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => handleChange('summary', e.target.value)}
                    placeholder="Brief description of what your company does"
                    rows={3}
                  />
                </div>
              </>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};