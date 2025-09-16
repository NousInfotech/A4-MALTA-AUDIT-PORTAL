// @ts-nocheck
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export const PendingApprovalPage = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="relative w-full max-w-md">
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-200/50 text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                  <img src="/logo.png" alt="Logo" className="h-16 w-16 object-cover rounded" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-700 rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-gray-900">
              Approval Pending
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Your account is pending admin approval
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8 text-center space-y-6">
            <p className="text-gray-600 text-lg leading-relaxed">
              Thank you for registering with Audit Portal. Your account has been created successfully, 
              but it requires approval from an administrator before you can access the system.
            </p>
            
            <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gray-700 rounded-xl flex items-center justify-center">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">Email Notification</h3>
              </div>
              <p className="text-sm text-gray-600">
                You will receive an email notification once your account has been approved. 
                This process typically takes 24-48 hours.
              </p>
            </div>
            
            <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-200/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gray-700 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">What's Next?</h3>
              </div>
              <p className="text-sm text-gray-600">
                Once approved, you'll be able to access all features of the platform and start managing your audit engagements.
              </p>
            </div>
            
            <div className="pt-6 border-t border-gray-200/50">
              <Button 
                onClick={logout} 
                variant="outline" 
                className="w-full h-12 border-gray-200 hover:bg-gray-50/50 text-gray-700 hover:text-gray-800 transition-all duration-300 rounded-xl font-semibold text-base"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};