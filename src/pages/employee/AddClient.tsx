// @ts-nocheck
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Plus,
  X,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import {
  ShareClassInput,
  type ShareClassValues,
  type ShareClassErrors,
  getDefaultShareClassValues,
  getDefaultShareClassErrors,
  buildTotalSharesPayload,
  calculateTotalSharesSum,
} from "@/components/client/ShareClassInput";
import { PaidUpSharesInput } from "@/components/client/PaidUpSharesInput";

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

const SHARE_CLASS_CONFIG = [
  { key: "classA", label: "Class A", backendValue: "A" },
  { key: "classB", label: "Class B", backendValue: "B" },
  { key: "classC", label: "Class C", backendValue: "C" },
  { key: "ordinary", label: "Ordinary", backendValue: "Ordinary" },
] as const;
const roles = [
  "Shareholder",
  "Director",
  "Judicial Representative",
  "Legal Representative",
  "Secretary",
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
    companyId: "",
    isCreateCompany: false,
    isNewCompany: true,
    totalShares: "",
    shareClassValues: getDefaultShareClassValues(),
    useClassShares: false,
    visibleShareClasses: [] as string[],
    selectedRoles: [] as string[],
    sharesData: [] as Array<{ totalShares: string; class: string }>,
    paidUpSharesPercentage: 0,
  });
  const [showPassword, setShowPassword] = useState(true);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companies, setCompanies] = useState<Array<{ _id: string; name: string; registrationNumber: string }>>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [nationalityOptions, setNationalityOptions] = useState<
    { value: string; label: string; isEuropean: boolean }[]
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { signup, isLoading, user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { logCreateClient } = useActivityLogger();
  const [hasSearched, setHasSearched] = useState(false);
  
  // Check if accessed from admin route
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Company number validation state
  const [isCheckingCompanyNumber, setIsCheckingCompanyNumber] = useState(false);
  const [companyNumberError, setCompanyNumberError] = useState("");
  const [isCompanyNumberDuplicate, setIsCompanyNumberDuplicate] = useState(false);

  // Check if company number already exists (returns boolean and updates state)
  const checkCompanyNumberExists = useCallback(async (companyNumber: string, updateState: boolean = true): Promise<boolean> => {
    if (!companyNumber || companyNumber.trim().length === 0) {
      if (updateState) {
        setCompanyNumberError("");
        setIsCompanyNumberDuplicate(false);
      }
      return false;
    }

    if (updateState) {
      setIsCheckingCompanyNumber(true);
      setCompanyNumberError("");
      setIsCompanyNumberDuplicate(false);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Check in profiles table (Supabase)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, company_number, company_name")
        .eq("company_number", companyNumber.trim())
        .eq("role", "client")
        .eq("organization_id", user?.organizationId);

      if (profilesError) {
        console.error("Error checking profiles:", profilesError);
      }

      // Check in Company collection (MongoDB via API)
      let companyExists = false;
      try {
        const response = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/company/search/global?search=${encodeURIComponent(companyNumber.trim())}&isNonPrimary=false`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session?.access_token}`,
            },
          }
        );

        if (response.ok) {
          const res = await response.json();
          if (res.success && res.data && res.data.length > 0) {
            // Check if any company has the exact registration number
            companyExists = res.data.some(
              (company: { registrationNumber: string }) =>
                company.registrationNumber.toLowerCase().trim() === companyNumber.toLowerCase().trim()
            );
          }
        }
      } catch (apiError) {
        console.error("Error checking companies via API:", apiError);
      }

      // If found in either profiles or companies, it's a duplicate
      const isDuplicate = (profiles && profiles.length > 0) || companyExists;
      
      if (updateState) {
        if (isDuplicate) {
          const existingClient = profiles && profiles.length > 0 ? profiles[0] : null;
          setCompanyNumberError(
            `This company number is already registered. ${existingClient ? `It belongs to: ${existingClient.company_name || "Unknown Company"}` : ""}`
          );
          setIsCompanyNumberDuplicate(true);
        } else {
          setCompanyNumberError("");
          setIsCompanyNumberDuplicate(false);
        }
      }
      
      return isDuplicate;
    } catch (err) {
      console.error("Error checking company number:", err);
      if (updateState) {
        setIsCheckingCompanyNumber(false);
      }
      return false; // Don't block submission if check fails
    } finally {
      if (updateState) {
        setIsCheckingCompanyNumber(false);
      }
    }
  }, [user?.organizationId]);

  // Debounced company number validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.companyNumber) {
        checkCompanyNumberExists(formData.companyNumber, true);
      } else {
        setCompanyNumberError("");
        setIsCompanyNumberDuplicate(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.companyNumber, checkCompanyNumberExists]);

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

  // Search companies
  const searchCompanies = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setCompanies([]);
      return;
    }

    setIsLoadingCompanies(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/company/search/global?search=${encodeURIComponent(searchTerm)}&isNonPrimary=true`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to search companies");

      const res = await response.json();
      if (res.success) {
        setCompanies(res.data || []);
      }
    } catch (err) {
      console.error("Error searching companies:", err);
      toast({
        title: "Error",
        description: "Failed to search companies",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleSelectCompany = (company: { _id: string; name: string; registrationNumber: string }) => {
    setFormData((prev) => ({
      ...prev,
      companyId: company._id,
      companyName: company.name,
      companyNumber: company.registrationNumber,
      isCreateCompany: true,
      isNewCompany: false,
    }));
    setShowCompanyDialog(false);
    setCompanySearch("");
  };

  const handleDeselectCompany = () => {
    setFormData((prev) => ({
      ...prev,
      isCreateCompany: false,
      isNewCompany: true,
      companyId: "",
      // Note: We don't clear companyName/companyNumber here as they are form fields
      // that the user may have entered. They will use the values from the form above.
      // Reset company creation specific fields
      shareClassValues: getDefaultShareClassValues(),
      useClassShares: false,
      visibleShareClasses: [],
      sharesData: [],
      selectedRoles: [],
      address: "",
      nationality: "",
    }));
    setShowCompanyDialog(false);
    setCompanySearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Final check before submission (without updating state to avoid flicker)
    const isDuplicate = await checkCompanyNumberExists(formData.companyNumber, false);
    if (isDuplicate) {
      // Update state to show error
      await checkCompanyNumberExists(formData.companyNumber, true);
      setError("Cannot create client: Company number is already registered. Please use a different company number.");
      setIsSubmitting(false);
      toast({
        title: "Validation Error",
        description: "This company number is already registered. Please use a different company number.",
        variant: "destructive",
      });
      return;
    }

    // Also check current state as a safeguard
    if (isCompanyNumberDuplicate) {
      setError("Cannot create client: Company number is already registered. Please use a different company number.");
      setIsSubmitting(false);
      toast({
        title: "Validation Error",
        description: "This company number is already registered. Please use a different company number.",
        variant: "destructive",
      });
      return;
    }

    const { name, email, password, companyName, companyNumber, summary, nationality, address, companyId, isCreateCompany, isNewCompany, selectedRoles, sharesData, paidUpSharesPercentage } =
      formData;

    const industry =
      formData.industry === "Other" ? formData.customValue : formData.industry;

    try {
      const { data, error } = await supabase.auth.getSession();
      
      // Prepare request body
      const requestBody: any = {
        email,
        password,
        name,
        companyName,
        companyNumber,
        industry,
        summary,
        nationality,
        address,
        companyId: companyId || undefined,
        role: "client",
        isCreateCompany,
        isNewCompany: formData.isNewCompany,
        authorizedShares: formData.shareClassValues?.authorizedShares,
        issuedShares: formData.shareClassValues?.issuedShares,
        perShareValue: {
          value: formData.shareClassValues?.perShareValue,
          currency: "EUR",
        },
      };

      // Add company creation data if enabled
      if (isCreateCompany) {
        // Build totalShares payload using ShareClassInput data
        const totalSharesPayload = formData.shareClassValues
          ? buildTotalSharesPayload(formData.shareClassValues)
          : undefined;

        // Calculate total shares sum (as a number) for backend validation
        const totalSharesSum = formData.shareClassValues
          ? calculateTotalSharesSum(formData.shareClassValues)
          : 0;

        // Add shareHolderData if totalShares is provided or sharesData exists
        if ((totalSharesPayload && totalSharesPayload.length > 0) || (sharesData && sharesData.length > 0) || totalSharesSum > 0) {
          const validShares = sharesData
            .filter((share) => share.totalShares)
            .map((share) => ({
              totalShares: parseInt(share.totalShares) || 0,
              class: share.class,
              type: "Ordinary", // Default type
            }));

          requestBody.shareHolderData = {
            // Send totalShares as a number (sum) for backend validation
            totalShares: totalSharesSum > 0 ? totalSharesSum : undefined,
            // Send the array format for the company's totalShares field
            totalSharesArray: totalSharesPayload && totalSharesPayload.length > 0 ? totalSharesPayload : undefined,
            shares: validShares.length > 0 ? validShares : undefined,
            paidUpSharesPercentage: paidUpSharesPercentage,
          };
        }

        // Add representationalSchema if roles are selected
        if (selectedRoles.length > 0) {
          requestBody.representationalSchema = [
            {
              role: selectedRoles,
            },
          ];
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/users/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session?.access_token}`,
          },
          body: JSON.stringify(requestBody),
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
      navigate(isAdminRoute ? "/admin/users" : "/employee/clients");
    } catch (err) {
      console.error("Error creating client:", err);
      setError(err.message || "Failed to create client. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleToggle = (role: string) => {
    setFormData((prev) => {
      const currentRoles = prev.selectedRoles || [];
      const newRoles = currentRoles.includes(role)
        ? currentRoles.filter((r) => r !== role)
        : [...currentRoles, role];
      return { ...prev, selectedRoles: newRoles };
    });
  };

  // Get all available share classes (always show all: A, B, C, Ordinary)
  const getAvailableShareClasses = (): Array<"A" | "B" | "C" | "Ordinary"> => {
    return ["A", "B", "C", "Ordinary"];
  };

  // Calculate available shares per class from company totalShares (all classes)
  const getAvailableSharesPerClass = (): Record<string, number> => {
    const available: Record<string, number> = {};
    
    // Get all share classes
    const classA = formData.shareClassValues.classA || 0;
    const classB = formData.shareClassValues.classB || 0;
    const classC = formData.shareClassValues.classC || 0;
    const ordinary = formData.shareClassValues.ordinary || 0;
    
    // Calculate allocated shares for each class
    const allocatedA = formData.sharesData
      .filter((s) => s.class === "A")
      .reduce((sum, s) => sum + (Number(s.totalShares) || 0), 0);
    const allocatedB = formData.sharesData
      .filter((s) => s.class === "B")
      .reduce((sum, s) => sum + (Number(s.totalShares) || 0), 0);
    const allocatedC = formData.sharesData
      .filter((s) => s.class === "C")
      .reduce((sum, s) => sum + (Number(s.totalShares) || 0), 0);
    const allocatedOrdinary = formData.sharesData
      .filter((s) => s.class === "Ordinary")
      .reduce((sum, s) => sum + (Number(s.totalShares) || 0), 0);
    
    // Calculate remaining shares
    available["A"] = Math.max(0, classA - allocatedA);
    available["B"] = Math.max(0, classB - allocatedB);
    available["C"] = Math.max(0, classC - allocatedC);
    available["Ordinary"] = Math.max(0, ordinary - allocatedOrdinary);
    
    return available;
  };



  // All share classes are always available now, no need for conditional updates

  const isShareholderSelected = formData.selectedRoles.includes("Shareholder");

  useEffect(() => {
    if (!formData.selectedRoles.includes("Shareholder")) {
      setFormData((prev) => ({
        ...prev,
        sharesData: [],
        useClassShares: false,
        visibleShareClasses: [],
      }));
    }
  }, [formData.selectedRoles]);
  

  const [shareClassErrors, setShareClassErrors] = useState(getDefaultShareClassErrors());

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
              className="rounded-xl bg-white border border-gray-200 text-brand-body hover:bg-gray-100 hover:text-brand-body shadow-sm"
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
                    <div className="relative">
                      <Input
                        id="companyNumber"
                        value={formData.companyNumber}
                        onChange={(e) => handleChange("companyNumber", e.target.value)}
                        placeholder="Enter company registration number"
                        className={`h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg w-full ${
                          companyNumberError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                        }`}
                        required
                      />
                      {isCheckingCompanyNumber && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-gray-400" />
                      )}
                    </div>
                    {companyNumberError && (
                      <p className="text-xs text-red-500 mt-1">{companyNumberError}</p>
                    )}
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
              {/* <div className="space-y-6">
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
              </div> */}

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

              {/* Create Company Options */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Company Creation
                  </h3>
                </div>

                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Company Record
                    </Label>
                    <p className="text-sm text-gray-500">
                      {formData.isCreateCompany 
                        ? "One client can only be associated with one company. You can deselect to choose a different company."
                        : "Choose to create a new company record or link to an existing one"}
                    </p>
                  </div>
                  {!formData.isCreateCompany && (
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          handleChange("isCreateCompany", true);
                          handleChange("isNewCompany", true);
                          handleChange("companyId", "");
                        }}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Company
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCompanyDialog(true);
                        }}
                        className="flex-1"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Add Existing Company
                      </Button>
                    </div>
                  )}
                  {formData.isCreateCompany && formData.isNewCompany && (
                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">Creating New Company</p>
                          <p className="text-sm text-gray-600 mt-1">
                            A new company record will be created using the company details entered above.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleDeselectCompany}
                          className="ml-2 text-gray-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {formData.isCreateCompany && !formData.isNewCompany && formData.companyId && (
                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">Selected Company:</p>
                          <p className="text-sm text-gray-600">{formData.companyName}</p>
                          <p className="text-xs text-gray-500">Reg: {formData.companyNumber}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleDeselectCompany}
                          className="ml-2 text-gray-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Creation Fields - Only show if creating new company */}
              {formData.isCreateCompany && formData.isNewCompany && (
                <>
                  {/* Address and Nationality */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Company & Person Details
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
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
                          className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
                          required
                        />
                      </div>
                      <div className="space-y-3">
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
                          <SelectTrigger className="h-12 border-gray-200 focus:border-gray-400 rounded-xl text-lg">
                            <SelectValue placeholder="Select nationality" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 rounded-xl max-h-72">
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
                    </div>
                  </div>

                  {/* Share Information: Company Total Shares (moved above Roles) */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Share Information
                      </h3>
                    </div>

                    <div className="space-y-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                      <div className="space-y-3">
                        <ShareClassInput
                          values={formData.shareClassValues}
                          errors={shareClassErrors}
                          onValuesChange={(values) => {
                            handleChange("shareClassValues", values);
                          }}
                          onErrorChange={(errs) => setShareClassErrors(errs)}
                          showTotal={true}
                          label="Company Total Shares *"
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500">
                          Total number of shares issued by the company
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Roles
                      </h3>
                    </div>

                    <div className="space-y-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
                      <Label className="text-sm font-medium text-gray-700">
                        Select Roles *
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.map((role) => (
                          <div
                            key={role}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`role-${role}`}
                              checked={formData.selectedRoles.includes(role)}
                              onCheckedChange={() => handleRoleToggle(role)}
                            />
                            <Label
                              htmlFor={`role-${role}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {role}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Client Share Holdings: only shown when Shareholder is selected */}
                  {isShareholderSelected && (
                  <div className="space-y-6">
                    <div className="space-y-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                      {/* Client Share Holdings */}
                      <div className="space-y-3 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-gray-700">
                            Client Share Holdings
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500">
                          Total shares the client holds and their class
                        </p>

                        {/* Show all share class inputs together: Class A, B, C, and Ordinary */}
                        <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Class A */}
                            {(() => {
                              const available = formData.shareClassValues.classA || 0;
                              const shareItem = formData.sharesData.find((s) => s.class === "A");
                              const currentValue = shareItem ? Number(shareItem.totalShares) || 0 : 0;
                              const remaining = Math.max(0, available - currentValue);
                              const hasError = currentValue > available;
                              
                              return (
                                <div key="A" className="space-y-2">
                                  <Label className="text-xs font-medium text-gray-600">
                                    Class A Shares
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={shareItem?.totalShares || ""}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      const existingIndex = formData.sharesData.findIndex((s) => s.class === "A");
                                      
                                      if (newValue && Number(newValue) > 0) {
                                        const updatedShares = [...formData.sharesData];
                                        if (existingIndex >= 0) {
                                          updatedShares[existingIndex] = { totalShares: newValue, class: "A" };
                                        } else {
                                          updatedShares.push({ totalShares: newValue, class: "A" });
                                        }
                                        setFormData((prev) => ({ ...prev, sharesData: updatedShares }));
                                      } else {
                                        const updatedShares = formData.sharesData.filter((_, i) => i !== existingIndex);
                                        setFormData((prev) => ({ ...prev, sharesData: updatedShares }));
                                      }
                                    }}
                                    className={`rounded-lg ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {available > 0 ? (
                                      currentValue > 0 ? (
                                        <>Remaining: {remaining.toLocaleString()} shares (Total: {available.toLocaleString()}, Allocated: {currentValue.toLocaleString()})</>
                                      ) : (
                                        <>Available: {available.toLocaleString()} shares</>
                                      )
                                    ) : (
                                      <>No Class A shares available</>
                                    )}
                                  </p>
                                  {hasError && (
                                    <p className="text-xs text-red-600 mt-1">
                                      Shares cannot exceed available shares ({available.toLocaleString()})
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                            
                            {/* Class B */}
                            {(() => {
                              const available = formData.shareClassValues.classB || 0;
                              const shareItem = formData.sharesData.find((s) => s.class === "B");
                              const currentValue = shareItem ? Number(shareItem.totalShares) || 0 : 0;
                              const remaining = Math.max(0, available - currentValue);
                              const hasError = currentValue > available;
                              
                              return (
                                <div key="B" className="space-y-2">
                                  <Label className="text-xs font-medium text-gray-600">
                                    Class B Shares
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={shareItem?.totalShares || ""}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      const existingIndex = formData.sharesData.findIndex((s) => s.class === "B");
                                      
                                      if (newValue && Number(newValue) > 0) {
                                        const updatedShares = [...formData.sharesData];
                                        if (existingIndex >= 0) {
                                          updatedShares[existingIndex] = { totalShares: newValue, class: "B" };
                                        } else {
                                          updatedShares.push({ totalShares: newValue, class: "B" });
                                        }
                                        setFormData((prev) => ({ ...prev, sharesData: updatedShares }));
                                      } else {
                                        const updatedShares = formData.sharesData.filter((_, i) => i !== existingIndex);
                                        setFormData((prev) => ({ ...prev, sharesData: updatedShares }));
                                      }
                                    }}
                                    className={`rounded-lg ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {available > 0 ? (
                                      currentValue > 0 ? (
                                        <>Remaining: {remaining.toLocaleString()} shares (Total: {available.toLocaleString()}, Allocated: {currentValue.toLocaleString()})</>
                                      ) : (
                                        <>Available: {available.toLocaleString()} shares</>
                                      )
                                    ) : (
                                      <>No Class B shares available</>
                                    )}
                                  </p>
                                  {hasError && (
                                    <p className="text-xs text-red-600 mt-1">
                                      Shares cannot exceed available shares ({available.toLocaleString()})
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                            
                            {/* Class C */}
                            {(() => {
                              const available = formData.shareClassValues.classC || 0;
                              const shareItem = formData.sharesData.find((s) => s.class === "C");
                              const currentValue = shareItem ? Number(shareItem.totalShares) || 0 : 0;
                              const remaining = Math.max(0, available - currentValue);
                              const hasError = currentValue > available;
                              
                              return (
                                <div key="C" className="space-y-2">
                                  <Label className="text-xs font-medium text-gray-600">
                                    Class C Shares
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={shareItem?.totalShares || ""}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      const existingIndex = formData.sharesData.findIndex((s) => s.class === "C");
                                      
                                      if (newValue && Number(newValue) > 0) {
                                        const updatedShares = [...formData.sharesData];
                                        if (existingIndex >= 0) {
                                          updatedShares[existingIndex] = { totalShares: newValue, class: "C" };
                                        } else {
                                          updatedShares.push({ totalShares: newValue, class: "C" });
                                        }
                                        setFormData((prev) => ({ ...prev, sharesData: updatedShares }));
                                      } else {
                                        const updatedShares = formData.sharesData.filter((_, i) => i !== existingIndex);
                                        setFormData((prev) => ({ ...prev, sharesData: updatedShares }));
                                      }
                                    }}
                                    className={`rounded-lg ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {available > 0 ? (
                                      currentValue > 0 ? (
                                        <>Remaining: {remaining.toLocaleString()} shares (Total: {available.toLocaleString()}, Allocated: {currentValue.toLocaleString()})</>
                                      ) : (
                                        <>Available: {available.toLocaleString()} shares</>
                                      )
                                    ) : (
                                      <>No Class C shares available</>
                                    )}
                                  </p>
                                  {hasError && (
                                    <p className="text-xs text-red-600 mt-1">
                                      Shares cannot exceed available shares ({available.toLocaleString()})
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                            
                            {/* Ordinary */}
                            {(() => {
                              const available = formData.shareClassValues.ordinary || 0;
                              const shareItem = formData.sharesData.find((s) => s.class === "Ordinary");
                              const currentValue = shareItem ? Number(shareItem.totalShares) || 0 : 0;
                              const remaining = Math.max(0, available - currentValue);
                              const hasError = currentValue > available;
                              
                              return (
                                <div key="Ordinary" className="space-y-2">
                                  <Label className="text-xs font-medium text-gray-600">
                                    Ordinary Shares
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={shareItem?.totalShares || ""}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      const existingIndex = formData.sharesData.findIndex((s) => s.class === "Ordinary");
                                      
                                      if (newValue && Number(newValue) > 0) {
                                        const updatedShares = [...formData.sharesData];
                                        if (existingIndex >= 0) {
                                          updatedShares[existingIndex] = { totalShares: newValue, class: "Ordinary" };
                                        } else {
                                          updatedShares.push({ totalShares: newValue, class: "Ordinary" });
                                        }
                                        setFormData((prev) => ({ ...prev, sharesData: updatedShares }));
                                      } else {
                                        const updatedShares = formData.sharesData.filter((_, i) => i !== existingIndex);
                                        setFormData((prev) => ({ ...prev, sharesData: updatedShares }));
                                      }
                                    }}
                                    className={`rounded-lg ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {available > 0 ? (
                                      currentValue > 0 ? (
                                        <>Remaining: {remaining.toLocaleString()} shares (Total: {available.toLocaleString()}, Allocated: {currentValue.toLocaleString()})</>
                                      ) : (
                                        <>Available: {available.toLocaleString()} shares</>
                                      )
                                    ) : (
                                      <>No Ordinary shares available</>
                                    )}
                                  </p>
                                  {hasError && (
                                    <p className="text-xs text-red-600 mt-1">
                                      Shares cannot exceed available shares ({available.toLocaleString()})
                                    </p>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Paid Up Shares Percentage */}
                            <div className="md:col-span-2">
                              <PaidUpSharesInput
                                value={formData.paidUpSharesPercentage}
                                onChange={(val) => handleChange("paidUpSharesPercentage", val)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    Object.values(shareClassErrors).some(Boolean) ||
                    isCompanyNumberDuplicate ||
                    isCheckingCompanyNumber
                  }
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl rounded-xl px-8 py-3 h-auto text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Company Selection Dialog */}
      <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Existing Company</DialogTitle>
            <DialogDescription>
              Search and select an existing company to link with this client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-search">Search Companies</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                id="company-search"
                value={companySearch}
                onChange={(e) => {
                setCompanySearch(e.target.value);
                setHasSearched(false); // reset when typing
                }}
                onKeyDown={(e) => {
                if (e.key === "Enter") {
                e.preventDefault();
                setHasSearched(true);
                searchCompanies(companySearch);
                }
                }}
                placeholder="Type company name and press Enter..."
                className="pl-10 h-12"
                />

              </div>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {isLoadingCompanies ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Searching companies...</p>
                </div>
           ) : companies.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">
                {hasSearched
                  ? "No companies found. Try a different search term."
                  : "Start typing to search for companies"}
              </p>
            </div>
          )
           : (
                <div className="divide-y divide-gray-200">
                  {companies.map((company) => (
                    <button
                      key={company._id}
                      type="button"
                      onClick={() => handleSelectCompany(company)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{company.name}</p>
                          <p className="text-sm text-gray-500">
                            Reg: {company.registrationNumber}
                          </p>
                        </div>
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
