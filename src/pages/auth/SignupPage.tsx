// @ts-nocheck
// src/pages/auth/SignupPage.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, CheckCircle, DollarSign, TrendingUp, Sparkles, ArrowRight, User, Mail, Key, Building2, Globe, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Energy",
  "Construction",
  "Education",
  "Transportation",
  "Real Estate",
  "Consulting",
  "Other",
];

export const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee" as UserRole,
    companyName: "",
    companyNumber: "",
    customValue: "",
    industry: "",
    summary: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      formData.role === "client" &&
      (!formData.companyName || !formData.companyNumber)
    ) {
      setError("Company information is required for client accounts");
      return;
    }
    const finalIndustry =
      formData.industry === "Other" ? formData.customValue : formData.industry;

    const success = await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      companyName: formData.companyName,
      companyNumber: formData.companyNumber,
      industry: finalIndustry,
      summary: formData.summary,
    });

    if (success) {
      toast({
        title: "Account created successfully",
        description:
          formData.role === "admin"
            ? "Admin account created successfully. You can now sign in."
            : "Your account is pending admin approval. You will receive an email when approved.",
      });
      navigate("/login");
    } else {
      setError("Email already exists or signup failed. Please try again.");
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-indigo-100/30 to-purple-100/20"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-3xl blur-3xl"></div>
      
      {/* Left Section - Enhanced Promotional Content */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden z-10">
        <div className="w-full h-full relative">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>
          
          {/* Floating Elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-40 right-20 w-24 h-24 bg-indigo-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-blue-400/20 rounded-full blur-lg animate-pulse delay-500"></div>
          
          {/* Main Content */}
          <div className="relative z-10 flex items-center justify-center h-full p-8">
            <div className="text-center text-white space-y-8 max-w-lg">
              {/* Logo */}
              <div className="flex items-center justify-center space-x-3 mb-8">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                  <img src="/logo.png" alt="Logo" className="h-12 w-12" />
                </div>
                <span className="text-3xl font-bold">AuditPortal</span>
              </div>
              
              <h1 className="text-5xl font-bold leading-tight">
                Transform Your
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">
                  Audit Experience
                </span>
              </h1>
              
              <p className="text-xl text-blue-100 leading-relaxed">
                Streamline your audit processes with our cutting-edge platform designed for modern professionals.
              </p>
              
              {/* Feature Cards */}
              <div className="grid grid-cols-1 gap-6 mt-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <h3 className="font-semibold text-white text-lg">Smart Automation</h3>
                      <p className="text-blue-100 text-sm">AI-powered audit procedures</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <h3 className="font-semibold text-white text-lg">Cost Efficiency</h3>
                      <p className="text-blue-100 text-sm">Reduce audit costs by 40%</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <h3 className="font-semibold text-white text-lg">Real-time Analytics</h3>
                      <p className="text-blue-100 text-sm">Live insights and reporting</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Enhanced Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16 z-10">
        <div className="relative w-full max-w-lg space-y-8">
          {/* Header */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <img src="/logo.png" alt="Logo" className="h-11 w-11" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AuditPortal</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                Create your account
              </h1>
              <p className="text-slate-600 text-lg">
                Join thousands of professionals already using AuditPortal
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl">
                  <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    className="h-14 pl-12 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="hello@reallygreatsite.com"
                    className="h-14 pl-12 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="••••••••"
                    className="h-14 pl-12 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="role" className="text-sm font-semibold text-slate-700">Account Type</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => handleChange("role", value)}
                >
                  <SelectTrigger className="h-14 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-2xl">
                    <SelectItem value="employee" className="rounded-xl">Employee (Auditor)</SelectItem>
                    <SelectItem value="client" className="rounded-xl">Client</SelectItem>
                    <SelectItem value="admin" className="rounded-xl">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "client" && (
                <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl border border-blue-100/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Company Information</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="companyName" className="text-sm font-semibold text-slate-700">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleChange("companyName", e.target.value)}
                        placeholder="Enter company name"
                        className="h-14 pl-12 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="companyNumber" className="text-sm font-semibold text-slate-700">Company Number</Label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                      <Input
                        id="companyNumber"
                        value={formData.companyNumber}
                        onChange={(e) => handleChange("companyNumber", e.target.value)}
                        placeholder="Enter company registration number"
                        className="h-14 pl-12 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="industry" className="text-sm font-semibold text-slate-700">Industry</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => handleChange("industry", value)}
                    >
                      <SelectTrigger className="h-14 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56 overflow-auto bg-white/95 backdrop-blur-sm border border-blue-100/50 rounded-2xl">
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry} className="rounded-xl">
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.industry === "Other" && (
                    <div className="space-y-3">
                      <Label htmlFor="customValue" className="text-sm font-semibold text-slate-700">
                        Please Specify The Industry
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-500" />
                        <Input
                          id="customValue"
                          value={formData.customValue}
                          onChange={(e) => handleChange("customValue", e.target.value)}
                          placeholder="Enter your custom value"
                          className="h-14 pl-12 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="summary" className="text-sm font-semibold text-slate-700">Company Summary</Label>
                    <Textarea
                      id="summary"
                      value={formData.summary}
                      onChange={(e) => handleChange("summary", e.target.value)}
                      placeholder="Brief description of what your company does"
                      rows={3}
                      className="bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg resize-none"
                    />
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" />
                )}
                Create Account
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center pt-6">
            <p className="text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors inline-flex items-center group">
                Sign in
                <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};