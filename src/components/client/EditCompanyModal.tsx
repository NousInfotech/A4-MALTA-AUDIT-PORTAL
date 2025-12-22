import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorMessage } from "@/components/ui/error-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, X } from "lucide-react";
import { ShareholdingCompaniesManager } from "./ShareholdingCompaniesManager";

const industryOptions = [
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
  "Hospitality",
  "Other",
];

const SHARE_CLASS_CONFIG = [
  { key: "classA", label: "Class A", backendValue: "A" },
  { key: "classB", label: "Class B", backendValue: "B" },
  { key: "classC", label: "Class C", backendValue: "C" },
  { key: "ordinary", label: "Ordinary", backendValue: "Ordinary" },
] as const;

type ShareClassKey = (typeof SHARE_CLASS_CONFIG)[number]["key"];
type ShareClassValues = Record<ShareClassKey, number> & {
  authorizedShares: number;
  issuedShares: number;
  perShareValue: number;
};
type ShareClassErrors = Record<ShareClassKey, string> & {
  authorizedShares?: string;
  issuedShares?: string;
  perShareValue?: string;
};

const DEFAULT_SHARE_TYPE = "Ordinary";

const getDefaultShareClassValues = (): ShareClassValues => ({
  classA: 0,
  classB: 0,
  classC: 0,
  ordinary: 0,
  authorizedShares: 0,
  issuedShares: 0,
  perShareValue: 0,
});

const getDefaultShareClassErrors = (): ShareClassErrors => ({
  classA: "",
  classB: "",
  classC: "",
  ordinary: "",
  authorizedShares: "",
  issuedShares: "",
  perShareValue: "",
});

/**
 * Builds the totalShares payload for the backend.
 * Includes all share classes: Class A, B, C, and Ordinary
 */
const buildTotalSharesPayload = (values: ShareClassValues) => {
  const allShares = SHARE_CLASS_CONFIG.map(({ key, backendValue }) => ({
    totalShares: Number(values[key]) || 0,
    class: backendValue,
    type: DEFAULT_SHARE_TYPE,
  }));
  
  // Filter out entries with totalShares <= 0 before sending to backend
  return allShares.filter(item => item.totalShares > 0);
};

const calculateTotalSharesSum = (values: ShareClassValues) => {
  return SHARE_CLASS_CONFIG.reduce((sum, { key }) => sum + (Number(values[key]) || 0), 0);
};

const runAllValidations = (
  currentValues: ShareClassValues,
  currentErrors: ShareClassErrors
): ShareClassErrors => {
  let newErrors: ShareClassErrors = { ...currentErrors, issuedShares: "" };

  const issued = currentValues.issuedShares;
  const authorized = currentValues.authorizedShares;
  const totalShareClassesSum = calculateTotalSharesSum(currentValues);

  if (issued > authorized) {
    newErrors.issuedShares = "Issued Shares cannot exceed Authorized Shares";
    return newErrors;
  }

  if (totalShareClassesSum > issued) {
    newErrors.issuedShares = `Total Share Classes (${totalShareClassesSum}) cannot exceed Issued Shares (${issued})`;
    return newErrors;
  }

  return newErrors;
};

// Helper to parse totalShares array from backend into shareClassValues
const parseTotalSharesArray = (totalSharesArray?: Array<{ totalShares: number; class: string; type: string }>): ShareClassValues => {
  const defaultValues = getDefaultShareClassValues();

  if (Array.isArray(totalSharesArray) && totalSharesArray.length > 0) {
    // Parse values from array
    totalSharesArray.forEach((item) => {
      if (item.class === "A") defaultValues.classA = Number(item.totalShares) || 0;
      if (item.class === "B") defaultValues.classB = Number(item.totalShares) || 0;
      if (item.class === "C") defaultValues.classC = Number(item.totalShares) || 0;
      if (item.class === "Ordinary") defaultValues.ordinary = Number(item.totalShares) || 0;
    });
  }

  return defaultValues;
};

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: any;
  clientId: string;
  onSuccess: () => void;
  existingCompanies?: any[];
}

export const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  isOpen,
  onClose,
  company,
  clientId,
  onSuccess,
  existingCompanies = [],
}) => {
  const [formData, setFormData] = useState({
    name: "",
    registrationNumber: "",
    address: "",
    status: "active",
    companyStartedAt: "",
    totalShares: 100,
    industry: "",
    customIndustry: "",
    description: "",
    // timelineEnd: "",
  });
  const [supportingDocuments, setSupportingDocuments] = useState<string[]>([]);
  const [shareHoldingCompanies, setShareHoldingCompanies] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharePercentageError, setSharePercentageError] = useState<string>("");
  const [errors, setErrors] = useState({
    name: "",
    registrationNumber: "",
    address: "",
  });
  const [shareClassValues, setShareClassValues] = useState<ShareClassValues>(
    () => getDefaultShareClassValues()
  );

  const [shareClassErrors, setShareClassErrors] = useState<ShareClassErrors>(
    () => getDefaultShareClassErrors()
  );

  // Store original share class values when company is loaded (for validation)
  const [originalShareClassValues, setOriginalShareClassValues] = useState<ShareClassValues>(
    () => getDefaultShareClassValues()
  );

  const totalSharesPayload = buildTotalSharesPayload(shareClassValues);
  const totalSharesSum = calculateTotalSharesSum(shareClassValues);
  const hasShareClassErrors = Object.values(shareClassErrors).some((err) => !!err);

  const { toast } = useToast();
  const isShareholdersAvailable = company.shareHoldingCompanies.length > 0 || company.shareHolders.length > 0;

  // Calculate purchased shares per share class
  const calculatePurchasedShares = (): Record<ShareClassKey, number> => {
    const purchased: Record<ShareClassKey, number> = {
      classA: 0,
      classB: 0,
      classC: 0,
      ordinary: 0,
    };

    // Sum shares from persons (shareHolders)
    if (company.shareHolders && Array.isArray(company.shareHolders)) {
      company.shareHolders.forEach((shareHolder: any) => {
        if (shareHolder.sharesData && Array.isArray(shareHolder.sharesData)) {
          shareHolder.sharesData.forEach((shareData: any) => {
            const shareClass = shareData.class;
            const totalShares = Number(shareData.totalShares) || 0;
            
            if (shareClass === "A") purchased.classA += totalShares;
            else if (shareClass === "B") purchased.classB += totalShares;
            else if (shareClass === "C") purchased.classC += totalShares;
            else if (shareClass === "Ordinary") purchased.ordinary += totalShares;
          });
        }
      });
    }

    // Sum shares from companies (shareHoldingCompanies)
    if (company.shareHoldingCompanies && Array.isArray(company.shareHoldingCompanies)) {
      company.shareHoldingCompanies.forEach((shareHoldingCompany: any) => {
        if (shareHoldingCompany.sharesData && Array.isArray(shareHoldingCompany.sharesData)) {
          shareHoldingCompany.sharesData.forEach((shareData: any) => {
            const shareClass = shareData.class;
            const totalShares = Number(shareData.totalShares) || 0;
            
            if (shareClass === "A") purchased.classA += totalShares;
            else if (shareClass === "B") purchased.classB += totalShares;
            else if (shareClass === "C") purchased.classC += totalShares;
            else if (shareClass === "Ordinary") purchased.ordinary += totalShares;
          });
        }
      });
    }

    return purchased;
  };

  const purchasedShares = calculatePurchasedShares();
  const hasPurchasedShares = Object.values(purchasedShares).some((val) => val > 0);
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = `companies/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("engagement-documents")
        .upload(fileName, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("engagement-documents").getPublicUrl(fileName);

      setSupportingDocuments([...supportingDocuments, publicUrl]);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDocument = (index: number) => {
    const updated = supportingDocuments.filter((_, i) => i !== index);
    setSupportingDocuments(updated);
  };

  const resolvedIndustry = (
    formData.industry === "Other" ? formData.customIndustry : formData.industry
  ).trim();



  const handleGeneralValueChange = (
    key: "authorizedShares" | "issuedShares" | "perShareValue",
    value: string
  ) => {
    const parsedValue = parseInt(value, 10);
    const newValue = Number.isNaN(parsedValue) ? 0 : parsedValue;

    setShareClassValues((prev) => {
      const nextValues = { ...prev, [key]: newValue };
      setShareClassErrors((prevErrs) => {
        let nextErrors = runAllValidations(nextValues, prevErrs);
        if (key === "issuedShares") {
          SHARE_CLASS_CONFIG.forEach(({ key: classKey, label }) => {
            const classVal = nextValues[classKey];
            if (classVal > nextValues.issuedShares) {
              nextErrors[classKey] = `${label} shares cannot exceed Issued Shares`;
            } else if (nextErrors[classKey]) {
              // Clear previous per-class error if now valid
              nextErrors[classKey] = "";
            }
          });
        }
        return nextErrors;
      });
      return nextValues;
    });
  };

  const handleGeneralValueBlur = (
    key: "authorizedShares" | "issuedShares" | "perShareValue"
  ) => {
    setShareClassErrors((prev) => runAllValidations(shareClassValues, prev));
  };

  const handleShareValueChange = (
    key: ShareClassKey,
    label: string,
    rawValue: string
  ) => {
    // Always allow typing - update the value immediately
    if (rawValue === "") {
      setShareClassValues((prev) => ({ ...prev, [key]: 0 }));
      setShareClassErrors((prev) => ({ ...prev, [key]: "" }));
      return;
    }

    const parsedValue = parseInt(rawValue, 10);
    
    // Allow typing even if it's not a valid number yet (user might be in the middle of typing)
    // But still update the value so the input reflects what they're typing
    if (Number.isNaN(parsedValue)) {
      // If it's not a valid number, don't update the numeric value but allow the input to show what they typed
      // The input will handle this with value={value === 0 ? "" : value}
      setShareClassErrors((prev) => ({
        ...prev,
        [key]: `${label} shares must be a valid number`,
      }));
      return;
    }

    if (parsedValue < 0) {
      setShareClassErrors((prev) => ({
        ...prev,
        [key]: `${label} shares must be 0 or greater`,
      }));
      // Still update the value to allow typing
      setShareClassValues((prev) => ({ ...prev, [key]: parsedValue }));
      return;
    }

    const purchasedForClass = purchasedShares[key];
    let error = "";

    // Validation when shares have been purchased
    if (hasPurchasedShares && purchasedForClass > 0) {
      // Cannot decrease below purchased shares
      if (parsedValue < purchasedForClass) {
        error = `Cannot decrease below ${purchasedForClass.toLocaleString()} purchased shares`;
      }
      // Allow increasing above purchased shares - no restriction on increases
    }

    // Per-class vs Issued Shares validation
    const issuedLimit = shareClassValues.issuedShares;
    if (parsedValue > issuedLimit && issuedLimit > 0) {
      error = `${label} shares cannot exceed Issued Shares`;
    }

    setShareClassValues((prev) => {
      const nextValues = { ...prev, [key]: parsedValue };
      setShareClassErrors((prevErrs) => {
        let nextErrors = { ...prevErrs, [key]: error };
        const issuedLimit = nextValues.issuedShares;
        if (issuedLimit > 0 && nextValues[key] > issuedLimit) {
          nextErrors[key] = `${label} shares cannot exceed Issued Shares`;
        }
        nextErrors = runAllValidations(nextValues, nextErrors);
        return nextErrors;
      });
      return nextValues;
    });
  };

  const handleShareValueBlur = (
    key: ShareClassKey,
    label: string,
    rawValue: string
  ) => {
    if (rawValue === "") {
      // On blur, if empty and shares are purchased, set to minimum (purchased shares)
      if (hasPurchasedShares && purchasedShares[key] > 0) {
        setShareClassValues((prev) => ({ ...prev, [key]: purchasedShares[key] }));
        setShareClassErrors((prev) => ({ ...prev, [key]: "" }));
      } else {
        setShareClassErrors((prev) => ({ ...prev, [key]: "" }));
        setShareClassValues((prev) => ({ ...prev, [key]: 0 }));
      }
      return;
    }

    const parsedValue = parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      setShareClassErrors((prev) => ({
        ...prev,
        [key]: `${label} shares must be 0 or greater`,
      }));
      return;
    }

    const purchasedForClass = purchasedShares[key];
    let error = "";

    // Validation when shares have been purchased
    if (hasPurchasedShares && purchasedForClass > 0) {
      // Cannot decrease below purchased shares
      if (parsedValue < purchasedForClass) {
        error = `Cannot decrease below ${purchasedForClass.toLocaleString()} purchased shares`;
      }
      // Allow increasing above purchased shares - no restriction on increases
    }

    // Per-class vs Issued Shares validation on blur
    const issuedLimit = shareClassValues.issuedShares;
    if (parsedValue > issuedLimit && issuedLimit > 0) {
      error = `${label} shares cannot exceed Issued Shares`;
    }

    setShareClassValues((prev) => {
      const nextValues = { ...prev, [key]: parsedValue };
      setShareClassErrors((prevErrs) => {
        let nextErrors = { ...prevErrs, [key]: error };
        const issuedLimit = nextValues.issuedShares;
        if (issuedLimit > 0 && parsedValue > issuedLimit) {
          nextErrors[key] = `${label} shares cannot exceed Issued Shares`;
        } else if (!error) {
          nextErrors[key] = "";
        }
        nextErrors = runAllValidations(nextValues, nextErrors);
        return nextErrors;
      });
      return nextValues;
    });
  };

  const validateField = (fieldName: string, value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: `${fieldName === "name" ? "Company name" : fieldName === "registrationNumber" ? "Registration number" : "Address"} is required`,
      }));
      return false;
    } else {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "",
      }));
      return true;
    }
  };

  const validateAllFields = () => {
    const newErrors = {
      name: formData.name.trim() ? "" : "Company name is required",
      registrationNumber: formData.registrationNumber.trim() ? "" : "Registration number is required",
      address: formData.address.trim() ? "" : "Address is required",
    };

    setErrors(newErrors);

    const nameValid = !!formData.name.trim();
    const registrationNumberValid = !!formData.registrationNumber.trim();
    const addressValid = !!formData.address.trim();

    return nameValid && registrationNumberValid && addressValid && !hasShareClassErrors;
  };

  useEffect(() => {
    if (company) {
      const companyIndustry = company.industry || "";
      const isPresetIndustry =
        companyIndustry && industryOptions.includes(companyIndustry);

      // Parse totalShares array from backend
      const parsedShareValues = parseTotalSharesArray(company.totalShares);

      setFormData({
        name: company.name || "",
        registrationNumber: company.registrationNumber || "",
        address: company.address || "",
        status: company.status || "active",
        companyStartedAt: company.companyStartedAt
          ? company.companyStartedAt.substring(0, 10)
          : "",
        totalShares: 100, // Keep for backward compatibility, but not used
        industry: isPresetIndustry
          ? companyIndustry
          : companyIndustry
            ? "Other"
            : "",
        customIndustry: isPresetIndustry ? "" : companyIndustry || "",
        description: company.description || "",
      });

      // Set share class values
      setShareClassValues({
        ...parsedShareValues,
        authorizedShares: Number(company.authorizedShares) || 0,
        issuedShares: Number(company.issuedShares) || calculateTotalSharesSum(parsedShareValues),
        perShareValue:
          typeof company.perShareValue === "object"
            ? Number(company.perShareValue?.value) || 0
            : Number(company.perShareValue) || 0,
      });
      // Store original values for validation
      setOriginalShareClassValues({
        ...parsedShareValues,
        authorizedShares: Number(company.authorizedShares) || 0,
        issuedShares: Number(company.issuedShares) || calculateTotalSharesSum(parsedShareValues),
        perShareValue:
          typeof company.perShareValue === "object"
            ? Number(company.perShareValue?.value) || 0
            : Number(company.perShareValue) || 0,
      });



      setSupportingDocuments(company.supportingDocuments || []);
      setShareHoldingCompanies(company.shareHoldingCompanies || []);

      // Reset errors when company data is loaded
      setErrors({
        name: "",
        registrationNumber: "",
        address: "",
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields before submitting
    if (!validateAllFields()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      // Build payload with all share classes (filtered to only include values > 0)
      const payload = {
        name: formData.name,
        registrationNumber: formData.registrationNumber,
        address: formData.address,
        status: formData.status,
        companyStartedAt: formData.companyStartedAt,
        totalShares: totalSharesPayload, // Includes all share classes with values > 0
        authorizedShares: shareClassValues.authorizedShares,
        issuedShares: shareClassValues.issuedShares,
        perShareValue: {
          value: shareClassValues.perShareValue,
          currency: "EUR"
        },
        industry: resolvedIndustry || undefined,
        description: formData.description.trim() || undefined,
        supportingDocuments,
        shareHoldingCompanies: shareHoldingCompanies.filter(
          (s) => s.companyId && s.sharePercentage > 0
        ),
      };

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${company._id
        }`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update company");
      }

      toast({
        title: "Success",
        description: "Company updated successfully",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error updating company:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update company",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">
            Edit Company
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-semibold">
                Company Name
              </Label>
              <Input
                id="name"
                placeholder="Enter company name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  validateField("name", e.target.value);
                }}
                onBlur={(e) => validateField("name", e.target.value)}
                className={`rounded-xl border-gray-200 ${errors.name ? "border-red-500" : ""
                  }`}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="registrationNumber"
                className="text-gray-700 font-semibold"
              >
                Registration Number
              </Label>
              <Input
                id="registrationNumber"
                placeholder="Enter registration number"
                value={formData.registrationNumber}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    registrationNumber: e.target.value,
                  });
                  validateField("registrationNumber", e.target.value);
                }}
                onBlur={(e) => validateField("registrationNumber", e.target.value)}
                className={`rounded-xl border-gray-200 ${errors.registrationNumber ? "border-red-500" : ""
                  }`}
              />
              {errors.registrationNumber && (
                <p className="text-sm text-red-500 mt-1">{errors.registrationNumber}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-700 font-semibold">
              Address
            </Label>
            <Textarea
              id="address"
              placeholder="Enter company address"
              value={formData.address}
              onChange={(e) => {
                setFormData({ ...formData, address: e.target.value });
                validateField("address", e.target.value);
              }}
              onBlur={(e) => validateField("address", e.target.value)}
              className={`rounded-xl border-gray-200 ${errors.address ? "border-red-500" : ""
                }`}
              rows={3}
            />
            {errors.address && (
              <p className="text-sm text-red-500 mt-1">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-700 font-semibold">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as "active" | "record" })
                }
              >
                <SelectTrigger className="rounded-xl border-gray-200">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="record">Record</SelectItem>
                </SelectContent>
              </Select>
            </div> */}

            <div className="space-y-2">
              <Label
                htmlFor="companyStartedAt"
                className="text-gray-700 font-semibold"
              >
                Company Start Date
              </Label>
              <Input
                id="companyStartedAt"
                type="date"
                value={formData.companyStartedAt}
                onChange={(e) =>
                  setFormData({ ...formData, companyStartedAt: e.target.value })
                }
                className="rounded-xl border-gray-200"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="industry" className="text-gray-700 font-semibold">
                Industry
              </Label>
              <Select
                value={formData.industry}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    industry: value,
                    customIndustry: value === "Other" ? prev.customIndustry : "",
                  }))
                }
              >
                <SelectTrigger
                  id="industry"
                  className="rounded-xl border-gray-200 text-left"
                >
                  <SelectValue placeholder="Select an industry" />
                </SelectTrigger>
                <SelectContent>
                  {industryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.industry === "Other" && (
                <Input
                  id="customIndustry"
                  placeholder="Enter custom industry"
                  value={formData.customIndustry}
                  onChange={(e) =>
                    setFormData({ ...formData, customIndustry: e.target.value })
                  }
                  className="rounded-xl border-gray-200"
                />
              )}
            </div>

          </div>
          {/* 
          <div className="space-y-2">
            <Label htmlFor="timelineEnd" className="text-gray-700 font-semibold">
              Timeline End
            </Label>
            <Input
              id="timelineEnd"
              type="date"
              value={formData.timelineEnd}
              onChange={(e) =>
                setFormData({ ...formData, timelineEnd: e.target.value })
              }
              className="rounded-xl border-gray-200"
            />
          </div> */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-700 font-semibold">
                Company Total Shares
              </Label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Total: {totalSharesSum.toLocaleString()}/ {shareClassValues.issuedShares.toLocaleString()}
                </span>
                {hasPurchasedShares && (
                  <span className="text-sm text-amber-600 font-medium">
                    Purchased: {Object.values(purchasedShares).reduce((sum, val) => sum + val, 0).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            {hasPurchasedShares && (
              <p className="text-xs text-gray-500 italic">
                Note: Shares have been purchased. You can increase or decrease total shares, but cannot decrease below the purchased amount.
              </p>
            )}
            {/* General company share inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="authorizedShares" className="text-gray-700 font-semibold">
                  Authorized Shares
                </Label>
                <Input
                  id="authorizedShares"
                  type="number"
                  min={shareClassValues.issuedShares || 0}
                  value={shareClassValues.authorizedShares || ""}
                  onChange={(e) => handleGeneralValueChange("authorizedShares", e.target.value)}
                  onBlur={() => handleGeneralValueBlur("authorizedShares")}
                  className={`rounded-xl border-gray-200`}
                  placeholder="Enter Authorized Shares"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issuedShares" className="text-gray-700 font-semibold">
                  Issued Shares
                </Label>
                <Input
                  id="issuedShares"
                  type="number"
                  min={totalSharesSum || 0}
                  max={shareClassValues.authorizedShares || undefined}
                  value={shareClassValues.issuedShares || ""}
                  onChange={(e) => handleGeneralValueChange("issuedShares", e.target.value)}
                  onBlur={() => handleGeneralValueBlur("issuedShares")}
                  className={`rounded-xl border-gray-200 ${shareClassErrors.issuedShares ? "border-red-500" : ""}`}
                  placeholder="Enter Issued Shares"
                />
                <ErrorMessage message={shareClassErrors.issuedShares} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perShareValue" className="text-gray-700 font-semibold">
                  Per Share Value (EUR)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  <Input
                    id="perShareValue"
                    type="number"
                    min={0}
                    value={shareClassValues.perShareValue || ""}
                    onChange={(e) => handleGeneralValueChange("perShareValue", e.target.value)}
                    className="pl-8 rounded-xl border-gray-200"
                    placeholder="Enter Per Share Value"
                  />
                </div>
              </div>
            </div>
            {/* All Share Class Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SHARE_CLASS_CONFIG.map(({ key, label }) => {
                const value = shareClassValues[key];
                const error = shareClassErrors[key];

                const purchasedForClass = purchasedShares[key];
                const showPurchasedInfo = hasPurchasedShares && purchasedForClass > 0;

                return (
                  <div className="space-y-2" key={key}>
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={key}
                        className="text-gray-700 font-semibold"
                      >
                        {label}
                      </Label>
                      {showPurchasedInfo && (
                        <span className="text-xs text-amber-600">
                          Purchased: {purchasedForClass.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <Input
                      id={key}
                      type="number"
                      step={1}
                      placeholder={`Enter ${label} shares`}
                      value={value === 0 ? "" : value}
                      onChange={(e) =>
                        handleShareValueChange(key, label, e.target.value)
                      }
                      onBlur={(e) =>
                        handleShareValueBlur(key, label, e.target.value)
                      }
                      className={`rounded-xl border-gray-200 ${error ? "border-red-500" : ""
                        }`}
                      inputMode="numeric"
                    />
                    {error && (
                      <p className="text-sm text-red-500 mt-1">{error}</p>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-gray-700 font-semibold"
            >
              Company Summary
            </Label>
            <Textarea
              id="description"
              placeholder="Provide a brief overview of the company"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="rounded-xl border-gray-200"
            />
          </div>

          {/* Supporting Documents */}
          {/* <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Supporting Documents</Label>
            <input
              type="file"
              onChange={handleUploadFile}
              className="hidden"
              id="edit-company-doc-upload"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
            />
            <label htmlFor="edit-company-doc-upload">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload documents</p>
                <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, XLS, XLSX</p>
              </div>
            </label>

            {supportingDocuments.length > 0 && (
              <div className="space-y-2 mt-3">
                {supportingDocuments.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <FileText className="h-4 w-4 text-gray-600" />
                    <p className="text-sm text-gray-700 flex-1 truncate">
                      Document {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDocument(index)}
                      className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div> */}

          {/* Shareholding Companies */}
          {existingCompanies.length > 0 && (
            <ShareholdingCompaniesManager
              companies={existingCompanies.filter((c) => c._id !== company._id)}
              value={shareHoldingCompanies}
              onChange={setShareHoldingCompanies}
            />
          )}

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                hasShareClassErrors ||
                !formData.name.trim() ||
                !formData.registrationNumber.trim() ||
                !formData.address.trim()
              }
              className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Company"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
