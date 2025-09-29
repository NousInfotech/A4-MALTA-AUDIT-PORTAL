// @ts-nocheck
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Loader2, Users, Mail, Globe, FileText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";

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

export const AddClient = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "client123",
    role: "client" as UserRole,
    companyName: "",
    companyNumber: "",
    industry: "",
    summary: "",
    customValue: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { signup, isLoading } = useAuth();

  const navigate = useNavigate();
  const { toast } = useToast();
  const { logCreateClient } = useActivityLogger();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { name, email, password, companyName, companyNumber, summary } = formData;

    const industry =
      formData.industry === "Other" ? formData.customValue : formData.industry;
      
    try {
      const { data, error } = await supabase.auth.getSession()
      const response = await fetch(`${import.meta.env.VITE_APIURL}/api/users/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token}`,
        },
        body: JSON.stringify({
          email,
          password,
          name,
          companyName,
          companyNumber,
          industry,
          summary,
        }),
      });

      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.error || "Failed to create client");
      }

      // Log client creation
      logCreateClient(`Created new client: ${companyName}`);

      toast({
        title: "Client created",
        description: "The client account is pending admin approval.",
      });
      navigate("/employee/clients");
    } catch (err) {
      console.error("Error creating client:", err);
      setError(err.message || "Failed to create client. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="rounded-xl border-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">Add New Client</h1>
                <p className="text-gray-700">Create a new client company profile</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Client Information</h2>
                <p className="text-gray-600">
                  Enter the basic information for the new client company
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">Client Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Enter Client's name"
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleChange("companyName", e.target.value)}
                      placeholder="Enter company name"
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="companyNumber" className="text-sm font-medium text-gray-700">Company Number *</Label>
                    <Input
                      id="companyNumber"
                      value={formData.companyNumber}
                      onChange={(e) => handleChange("companyNumber", e.target.value)}
                      placeholder="Enter company registration number"
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Company Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="contact@company.com"
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Industry */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center">
                    <Globe className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Industry Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="industry" className="text-sm font-medium text-gray-700">Industry *</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => handleChange("industry", value)}
                    >
                      <SelectTrigger className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 rounded-xl">
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
                      <Label htmlFor="customValue" className="text-sm font-medium text-gray-700">
                        Please Specify The Industry
                      </Label>
                      <Input
                        id="customValue"
                        value={formData.customValue}
                        onChange={(e) => handleChange("customValue", e.target.value)}
                        placeholder="Enter your custom value"
                        className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Company Summary</h3>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="summary" className="text-sm font-medium text-gray-700">Company Summary</Label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => handleChange("summary", e.target.value)}
                    placeholder="Brief description of what the company does..."
                    rows={4}
                    className="border-gray-200 focus:border-gray-400 rounded-xl text-lg resize-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl rounded-xl px-8 py-3 h-auto text-lg font-semibold"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  Create Client
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 rounded-xl px-8 py-3 h-auto text-lg font-semibold"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
