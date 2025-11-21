// @ts-nocheck
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
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
} from "lucide-react";
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
    nationality: "",
    address: "",
    phoneNumber: "",
    companyId: "",
  });
  const [showPassword, setShowPassword] = useState(true);
  const [nationalityOptions, setNationalityOptions] = useState<
    { value: string; label: string; isEuropean: boolean }[]
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { signup, isLoading } = useAuth();

  const navigate = useNavigate();
  const { toast } = useToast();
  const { logCreateClient } = useActivityLogger();

  // Fetch nationality options
  useEffect(() => {
    const fetchNationalities = async () => {
      try {
        const res = await fetch(
          "https://cdn.jsdelivr.net/npm/world-countries@latest/countries.json"
        );
        if (!res.ok) throw new Error("Failed to load nationalities");
        const raw = await res.json();

        const items: { value: string; label: string; isEuropean: boolean }[] = [];
        const seen = new Set<string>();

        (Array.isArray(raw) ? raw : []).forEach((entry: any) => {
          const region = entry?.region || "";
          const demonym = entry?.demonyms?.eng?.m || entry?.demonyms?.eng?.f || "";
          const label = demonym || entry?.name?.common || "";
          if (!label) return;
          const key = label.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          items.push({
            value: label,
            label,
            isEuropean: region === "Europe",
          });
        });

        items.sort((a, b) => {
          if (a.isEuropean !== b.isEuropean) return a.isEuropean ? -1 : 1;
          return a.label.localeCompare(b.label);
        });

        setNationalityOptions(items);
      } catch (e) {
        console.error(e);
        const fallback = [
          { value: "Maltese", label: "Maltese", isEuropean: true },
          { value: "Italian", label: "Italian", isEuropean: true },
          { value: "French", label: "French", isEuropean: true },
          { value: "German", label: "German", isEuropean: true },
          { value: "Spanish", label: "Spanish", isEuropean: true },
          { value: "British", label: "British", isEuropean: true },
          { value: "American", label: "American", isEuropean: false },
          { value: "Canadian", label: "Canadian", isEuropean: false },
          { value: "Australian", label: "Australian", isEuropean: false },
        ];
        setNationalityOptions(fallback);
      }
    };

    fetchNationalities();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { name, email, password, companyName, companyNumber, summary, nationality, address, phoneNumber, companyId } =
      formData;

    const industry =
      formData.industry === "Other" ? formData.customValue : formData.industry;

    try {
      const { data, error } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/users/create`,
        {
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
            nationality,
            address,
            phoneNumber,
            companyId: companyId || undefined,
            role: "client",
          }),
        }
      );

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
    <div className="w-full bg-brand-body p-4 sm:p-6 box-border">
      <div className="max-w-4xl mx-auto w-full box-border">
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
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-brand-body">
                  Add New Client
                </h1>
                <p className="text-gray-700">
                  Create a new client company profile
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden w-full">
          <div className="bg-gray-50 border-b border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-semibold text-gray-900 truncate">
                  Client Information
                </h2>
                <p className="text-gray-600 truncate">
                  Enter the basic information for the new client company
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 w-full box-border">
            <form onSubmit={handleSubmit} className="space-y-8 w-full">
              {/* Basic Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Basic Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-3 min-w-0 w-full">
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
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full"
                      required
                    />
                  </div>
                  <div className="space-y-3 min-w-0 w-full">
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
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full"
                      required
                    />
                  </div>
                  <div className="space-y-3 min-w-0 w-full">
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
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full"
                      required
                    />
                  </div>
                  <div className="space-y-3 min-w-0 w-full">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Company Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="contact@company.com"
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full"
                      required
                    />
                  </div>
                  <div className="space-y-3 min-w-0 w-full">
                    <Label
                      htmlFor="phoneNumber"
                      className="text-sm font-medium text-gray-700"
                    >
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleChange("phoneNumber", e.target.value)}
                      placeholder="+356 2123 4567"
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full"
                    />
                  </div>
                  <div className="space-y-3 relative min-w-0 w-full">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700"
                    >
                      Company Password *
                    </Label>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      placeholder="Client123"
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Personal Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-3 min-w-0 w-full">
                    <Label
                      htmlFor="nationality"
                      className="text-sm font-medium text-gray-700"
                    >
                      Nationality *
                    </Label>
                    <Select
                      value={formData.nationality}
                      onValueChange={(value) => handleChange("nationality", value)}
                    >
                      <SelectTrigger className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full">
                        <SelectValue placeholder="Select nationality" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 rounded-xl max-h-72 w-[var(--radix-select-trigger-width)]">
                        {nationalityOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="rounded-lg"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 min-w-0 w-full">
                    <Label
                      htmlFor="address"
                      className="text-sm font-medium text-gray-700"
                    >
                      Address *
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="Enter address"
                      className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Industry */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                    <Globe className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Industry Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-3 min-w-0 w-full">
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
                      <SelectTrigger className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 rounded-xl w-[var(--radix-select-trigger-width)]">
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
                    <div className="space-y-3 min-w-0 w-full">
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
                        className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Company Summary
                  </h3>
                </div>

                <div className="space-y-3 w-full box-border">
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
                    className="border-gray-200 focus:border-gray-400 rounded-xl text-lg resize-none w-full"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl rounded-xl px-8 py-3 h-auto text-lg font-semibold"
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
