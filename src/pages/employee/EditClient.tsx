// @ts-nocheck
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useState, useEffect } from "react"; // Added useEffect
import { useNavigate, useParams } from "react-router-dom"; // Added useParams
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
import {
  ArrowLeft,
  Building2,
  Loader2,
  Users,
  Mail,
  Globe,
  FileText,
  Sparkles,
  EyeOff,
  Eye,
  Edit,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
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

export const EditClient = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logCreateClient, logUpdateClient } = useActivityLogger();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "client123",
    companyName: "",
    companyNumber: "",
    industry: "",
    summary: "",
    customValue: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const getClientEmail = async (userId: string): Promise<string> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/users/email/${userId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch client email");
      const res = await response.json();
      return res.clientData.email;
    } catch (error) {
      console.error("Error fetching client email:", error);

      return "Email not available";
    }
  };

  useEffect(() => {
    const fetchClientData = async () => {
      if (!id) {
        navigate("/employee/clients");
        return;
      }
      try {
        setIsLoading(true);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            `name, company_name, company_number, industry, company_summary`
          )
          .eq("user_id", id)
          .single();

        if (profileError) throw profileError;

        let email = "Email not available";
        try {
          email = await getClientEmail(id);
        } catch (emailError) {
          console.warn("Could not fetch email during edit:", emailError);
        }

        const industryValue = industries.includes(profileData.industry)
          ? profileData.industry
          : "Other";
        const customValue =
          industryValue === "Other" ? profileData.industry : "";

        setFormData({
          name: profileData.name || "",
          email: email,
          password: "",
          companyName: profileData.company_name || "",
          companyNumber: profileData.company_number || "",
          industry: industryValue,
          summary: profileData.company_summary || "",
          customValue: customValue,
        });
      } catch (err: any) {
        console.error("Error fetching client for edit:", err);
        toast({
          title: "Error",
          description: `Unable to load client data: ${err.message}`,
          variant: "destructive",
        });
        navigate("/employee/clients");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [id, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { name, email, companyName, companyNumber, summary } = formData;
    const industry =
      formData.industry === "Other" ? formData.customValue : formData.industry;

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/users/update/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session?.access_token}`,
          },
          body: JSON.stringify({
            name,
            companyName,
            companyNumber,
            industry,
            summary,
          }),
        }
      );

      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.error || "Failed to update client");
      }

      logUpdateClient(`Updated client details for: ${companyName}`);

      toast({
        title: "Client Updated",
        description: `Details for ${companyName} have been successfully updated.`,
      });
      navigate(`/employee/clients/${id}`);
    } catch (err: any) {
      console.error("Error updating client:", err);
      setError(err.message || "Failed to update client. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader size="lg" text="Loading client data..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-4xl mx-auto">
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
                <h1 className="text-3xl font-semibold text-gray-900">
                  Edit Client: {formData.companyName}
                </h1>
                <p className="text-gray-700">
                  Modify the profile details for this client company
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Client Information
                </h2>
                <p className="text-gray-600">
                  Update the contact and company information below
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Basic Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-700"
                    >
                      Client Name *
                    </Label>
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
                    <Label
                      htmlFor="companyName"
                      className="text-sm font-medium text-gray-700"
                    >
                      Company Name *
                    </Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) =>
                        handleChange("companyName", e.target.value)
                      }
                      placeholder="Enter company name"
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="companyNumber"
                      className="text-sm font-medium text-gray-700"
                    >
                      Company Number *
                    </Label>
                    <Input
                      id="companyNumber"
                      value={formData.companyNumber}
                      onChange={(e) =>
                        handleChange("companyNumber", e.target.value)
                      }
                      placeholder="Enter company registration number"
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Company Email (Read Only)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      placeholder="contact@company.com"
                      className="h-12 border-gray-200 rounded-xl text-lg bg-gray-100 cursor-not-allowed"
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    Industry Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label
                      htmlFor="industry"
                      className="text-sm font-medium text-gray-700"
                    >
                      Industry *
                    </Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => handleChange("industry", value)}
                    >
                      <SelectTrigger className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 rounded-xl">
                        {industries.map((industry) => (
                          <SelectItem
                            key={industry}
                            value={industry}
                            className="rounded-lg"
                          >
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.industry === "Other" && (
                    <div className="space-y-3">
                      <Label
                        htmlFor="customValue"
                        className="text-sm font-medium text-gray-700"
                      >
                        Please Specify The Industry
                      </Label>
                      <Input
                        id="customValue"
                        value={formData.customValue}
                        onChange={(e) =>
                          handleChange("customValue", e.target.value)
                        }
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
                  <h3 className="text-lg font-semibold text-gray-900">
                    Company Summary
                  </h3>
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="summary"
                    className="text-sm font-medium text-gray-700"
                  >
                    Company Summary
                  </Label>
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

              <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl rounded-xl px-8 py-3 h-auto text-lg font-semibold"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Edit className="mr-2 h-5 w-5" />
                  )}
                  {isSubmitting ? "Saving..." : "Update Client"}
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
