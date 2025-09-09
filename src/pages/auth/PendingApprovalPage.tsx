// @ts-nocheck
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export const PendingApprovalPage = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center p-6 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-indigo-100/30 to-purple-100/20"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-3xl blur-3xl"></div>
      
      <div className="relative w-full max-w-md z-10">
        <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50 text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg">
                  <img src="/logo.png" alt="Logo" className="h-14 w-14" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Approval Pending
            </CardTitle>
            <CardDescription className="text-lg text-slate-600">
              Your account is pending admin approval
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8 text-center space-y-6">
            <p className="text-slate-600 text-lg leading-relaxed">
              Thank you for registering with AuditPortal. Your account has been created successfully, 
              but it requires approval from an administrator before you can access the system.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800">Email Notification</h3>
              </div>
              <p className="text-sm text-slate-600">
                You will receive an email notification once your account has been approved. 
                This process typically takes 24-48 hours.
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800">What's Next?</h3>
              </div>
              <p className="text-sm text-slate-600">
                Once approved, you'll be able to access all features of the platform and start managing your audit engagements.
              </p>
            </div>
            
            <div className="pt-6 border-t border-blue-100/50">
              <Button 
                onClick={logout} 
                variant="outline" 
                className="w-full h-14 border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 transition-all duration-300 rounded-2xl font-semibold text-lg"
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