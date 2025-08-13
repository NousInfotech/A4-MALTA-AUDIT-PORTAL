// @ts-nocheck
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Shield } from 'lucide-react';

export const PendingApprovalPage = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Shield className="h-12 w-12 text-primary" />
              <Clock className="h-6 w-6 text-warning absolute -bottom-1 -right-1 bg-background rounded-full p-1" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Approval Pending</CardTitle>
          <CardDescription>
            Your account is pending admin approval
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Thank you for registering with AuditPortal. Your account has been created successfully, 
            but it requires approval from an administrator before you can access the system.
          </p>
          
          <p className="text-sm text-muted-foreground">
            You will receive an email notification once your account has been approved. 
            This process typically takes 24-48 hours.
          </p>
          
          <div className="pt-4">
            <Button onClick={logout} variant="outline" className="w-full">
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};