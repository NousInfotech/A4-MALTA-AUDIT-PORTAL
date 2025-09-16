// @ts-nocheck
// src/pages/auth/SignupPage.tsx
import { useState } from "react";
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
// import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, CheckCircle, DollarSign, TrendingUp, Sparkles, ArrowRight, User, Mail, Key, Building2, Globe, FileText, Users } from "lucide-react";
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

  console.log('SignupPage rendering...');

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
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Section - Dark Theme */}
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
              Join
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
              
              <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">Real-time Analytics</h3>
                    <p className="text-gray-300 text-sm">Live insights and reporting</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Light Theme */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
        <div className="relative w-full max-w-lg space-y-8">
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
                Create your account
              </h1>
              <p className="text-gray-600 text-lg">
                Join thousands of professionals already using Audit Portal
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
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    className="h-12 pl-12 border-gray-200 focus:border-gray-400 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="hello@reallygreatsite.com"
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
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pl-12 pr-12 border-gray-200 focus:border-gray-400 rounded-lg"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="role" className="text-sm font-semibold text-gray-700">Account Type</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => handleChange("role", value)}
                >
                  <SelectTrigger className="h-12 border-gray-200 focus:border-gray-400 rounded-lg">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 rounded-lg">
                    <SelectItem value="employee" className="rounded-lg">Employee (Auditor)</SelectItem>
                    <SelectItem value="client" className="rounded-lg">Client</SelectItem>
                    <SelectItem value="admin" className="rounded-lg">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "client" && (
                <div className="space-y-6 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gray-700 rounded-xl flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">Company Information</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleChange("companyName", e.target.value)}
                        placeholder="Enter company name"
                        className="h-12 pl-12 border-gray-200 focus:border-gray-400 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="companyNumber" className="text-sm font-semibold text-gray-700">Company Number</Label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
                      <Input
                        id="companyNumber"
                        value={formData.companyNumber}
                        onChange={(e) => handleChange("companyNumber", e.target.value)}
                        placeholder="Enter company registration number"
                        className="h-12 pl-12 border-gray-200 focus:border-gray-400 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="industry" className="text-sm font-semibold text-gray-700">Industry</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => handleChange("industry", value)}
                    >
                      <SelectTrigger className="h-12 border-gray-200 focus:border-gray-400 rounded-lg">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56 overflow-auto bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl">
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry} className="rounded-lg">
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.industry === "Other" && (
                    <div className="space-y-3">
                      <Label htmlFor="customValue" className="text-sm font-semibold text-gray-700">
                        Please Specify The Industry
                      </Label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
                        <Input
                          id="customValue"
                          value={formData.customValue}
                          onChange={(e) => handleChange("customValue", e.target.value)}
                          placeholder="Enter your custom value"
                          className="h-12 pl-12 border-gray-200 focus:border-gray-400 rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="summary" className="text-sm font-semibold text-gray-700">Company Summary</Label>
                    <Textarea
                      id="summary"
                      value={formData.summary}
                      onChange={(e) => handleChange("summary", e.target.value)}
                      placeholder="Brief description of what your company does"
                      rows={3}
                        className="bg-white/90 border-gray-200 focus:border-gray-400 rounded-lg resize-none"
                    />
                  </div>
                </div>
              )}

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold" 
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
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-gray-800 font-semibold hover:text-gray-900 transition-colors inline-flex items-center group">
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