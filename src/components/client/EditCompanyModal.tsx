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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
type ShareClassValues = Record<ShareClassKey, number>;
type ShareClassErrors = Record<ShareClassKey, string>;

const DEFAULT_SHARE_TYPE = "Ordinary";

const getDefaultShareClassValues = (): ShareClassValues => ({
  classA: 0,
  classB: 0,
  classC: 0,
  ordinary: 100,
});

const getDefaultShareClassErrors = (): ShareClassErrors => ({
  classA: "",
  classB: "",
  classC: "",
  ordinary: "",
});

/**
 * Builds the totalShares payload for the backend.
 * IMPORTANT: Only includes the selected mode's data:
 * - If useClassShares is false: ONLY sends Ordinary share data (A, B, C are excluded)
 * - If useClassShares is true: ONLY sends Class A, B, C share data (Ordinary is excluded)
 */
const buildTotalSharesPayload = (values: ShareClassValues, useClassShares: boolean) => {
  if (useClassShares) {
    // Share Classes mode: ONLY include Class A, B, C (Ordinary is completely excluded)
    return SHARE_CLASS_CONFIG
      .filter(({ key }) => key !== "ordinary")
      .map(({ key, backendValue }) => ({
        totalShares: Number(values[key]) || 0,
        class: backendValue,
        type: DEFAULT_SHARE_TYPE,
      }));
  } else {
    // Ordinary mode: ONLY include Ordinary (A, B, C are completely excluded)
    return SHARE_CLASS_CONFIG
      .filter(({ key }) => key === "ordinary")
      .map(({ key, backendValue }) => ({
        totalShares: Number(values[key]) || 0,
        class: backendValue,
        type: DEFAULT_SHARE_TYPE,
      }));
  }
};

const calculateTotalSharesSum = (values: ShareClassValues, useClassShares: boolean) => {
  if (useClassShares) {
    // Only sum Class A, B, C (exclude Ordinary)
    return SHARE_CLASS_CONFIG.filter(({ key }) => key !== "ordinary")
      .reduce((sum, { key }) => sum + (Number(values[key]) || 0), 0);
  } else {
    // Only sum Ordinary (exclude A, B, C)
    return Number(values.ordinary) || 0;
  }
};

const OPTIONAL_SHARE_CLASS_LABELS = SHARE_CLASS_CONFIG.filter(
  ({ key }) => key !== "ordinary"
).map(({ label }) => label);

// Helper to parse totalShares array from backend into shareClassValues
const parseTotalSharesArray = (totalSharesArray?: Array<{ totalShares: number; class: string; type: string }>): { values: ShareClassValues; useClassShares: boolean } => {
  const defaultValues = getDefaultShareClassValues();
  let useClassShares = false;

  if (!Array.isArray(totalSharesArray) || totalSharesArray.length === 0) {
    return { values: defaultValues, useClassShares: false };
  }

  // Check if we have Ordinary or Share Classes
  const hasOrdinary = totalSharesArray.some(item => item.class === "Ordinary");
  const hasShareClasses = totalSharesArray.some(item => ["A", "B", "C"].includes(item.class));

  if (hasShareClasses && !hasOrdinary) {
    // Share Classes mode
    useClassShares = true;
    totalSharesArray.forEach(item => {
      if (item.class === "A") defaultValues.classA = Number(item.totalShares) || 0;
      else if (item.class === "B") defaultValues.classB = Number(item.totalShares) || 0;
      else if (item.class === "C") defaultValues.classC = Number(item.totalShares) || 0;
    });
  } else if (hasOrdinary && !hasShareClasses) {
    // Ordinary mode
    useClassShares = false;
    const ordinaryItem = totalSharesArray.find(item => item.class === "Ordinary");
    if (ordinaryItem) {
      defaultValues.ordinary = Number(ordinaryItem.totalShares) || 0;
    }
  } else {
    // Default to Ordinary if ambiguous
    useClassShares = false;
    const ordinaryItem = totalSharesArray.find(item => item.class === "Ordinary");
    if (ordinaryItem) {
      defaultValues.ordinary = Number(ordinaryItem.totalShares) || 0;
    }
  }

  return { values: defaultValues, useClassShares };
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
  const [totalSharesError, setTotalSharesError] = useState<string>("");
  const [errors, setErrors] = useState({
    name: "",
    registrationNumber: "",
    address: "",
  });
  const [useClassShares, setUseClassShares] = useState(false);
  const [visibleShareClasses, setVisibleShareClasses] = useState<string[]>([]);

  const [shareClassValues, setShareClassValues] = useState<ShareClassValues>(
    () => getDefaultShareClassValues()
  );

  const [shareClassErrors, setShareClassErrors] = useState<ShareClassErrors>(
    () => getDefaultShareClassErrors()
  );

  const totalSharesPayload = buildTotalSharesPayload(shareClassValues, useClassShares);
  const totalSharesSum = calculateTotalSharesSum(shareClassValues, useClassShares);

  const { toast } = useToast();

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

  useEffect(() => {
    if (totalSharesSum <= 0) {
      setTotalSharesError("Enter at least one share amount greater than 0");
    } else {
      setTotalSharesError("");
    }
  }, [totalSharesSum]);

  const handleShareValueChange = (
    key: ShareClassKey,
    label: string,
    rawValue: string
  ) => {
    if (rawValue === "") {
      setShareClassValues((prev) => ({ ...prev, [key]: 0 }));
      setShareClassErrors((prev) => ({ ...prev, [key]: "" }));
      return;
    }

    const parsedValue = parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      setShareClassErrors((prev) => ({
        ...prev,
        [key]: `${label} shares must be 0 or greater`,
      }));
    } else {
      setShareClassErrors((prev) => ({ ...prev, [key]: "" }));
      
      // Reset the inactive mode when entering a value
      if (key === "ordinary") {
        // If entering Ordinary, reset A, B, C
        setShareClassValues((prev) => ({
          ...prev,
          [key]: parsedValue,
          classA: 0,
          classB: 0,
          classC: 0,
        }));
      } else {
        // If entering A, B, or C, reset Ordinary
        setShareClassValues((prev) => ({
          ...prev,
          [key]: parsedValue,
          ordinary: 0,
        }));
      }
    }
  };

  const handleShareValueBlur = (
    key: ShareClassKey,
    label: string,
    rawValue: string
  ) => {
    if (rawValue === "") {
      setShareClassErrors((prev) => ({ ...prev, [key]: "" }));
      setShareClassValues((prev) => ({ ...prev, [key]: 0 }));
      return;
    }

    const parsedValue = parseInt(rawValue, 10);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      setShareClassErrors((prev) => ({
        ...prev,
        [key]: `${label} shares must be 0 or greater`,
      }));
    }
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
    
    // Validate total shares using the calculated sum
    const currentTotalSum = calculateTotalSharesSum(shareClassValues, useClassShares);
    let sharesError = "";
    if (currentTotalSum <= 0) {
      sharesError = "Enter at least one share amount greater than 0";
    }
    setTotalSharesError(sharesError);
    
    const nameValid = !!formData.name.trim();
    const registrationNumberValid = !!formData.registrationNumber.trim();
    const addressValid = !!formData.address.trim();
    const totalSharesValid = !sharesError && currentTotalSum > 0;
    
    return nameValid && registrationNumberValid && addressValid && totalSharesValid;
  };

  useEffect(() => {
    if (company) {
      const companyIndustry = company.industry || "";
      const isPresetIndustry =
        companyIndustry && industryOptions.includes(companyIndustry);
      
      // Parse totalShares array from backend
      const { values: parsedShareValues, useClassShares: parsedUseClassShares } = 
        parseTotalSharesArray(company.totalShares);
      
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
      
      // Set share class values and mode
      setShareClassValues(parsedShareValues);
      setUseClassShares(parsedUseClassShares);
      if (parsedUseClassShares) {
        setVisibleShareClasses(OPTIONAL_SHARE_CLASS_LABELS);
      } else {
        setVisibleShareClasses([]);
      }
      
      // Validate totalShares on load
      const totalSum = calculateTotalSharesSum(parsedShareValues, parsedUseClassShares);
      if (totalSum <= 0) {
        setTotalSharesError("Enter at least one share amount greater than 0");
      } else {
        setTotalSharesError("");
      }
      
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

      // Build payload with only the selected mode's share data
      const payload = {
        name: formData.name,
        registrationNumber: formData.registrationNumber,
        address: formData.address,
        status: formData.status,
        companyStartedAt: formData.companyStartedAt,
        totalShares: totalSharesPayload, // Already filtered to only include active mode
        industry: resolvedIndustry || undefined,
        description: formData.description.trim() || undefined,
        supportingDocuments,
        shareHoldingCompanies: shareHoldingCompanies.filter(
          (s) => s.companyId && s.sharePercentage > 0
        ),
      };

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${
          company._id
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
                className={`rounded-xl border-gray-200 ${
                  errors.name ? "border-red-500" : ""
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
                className={`rounded-xl border-gray-200 ${
                  errors.registrationNumber ? "border-red-500" : ""
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
              className={`rounded-xl border-gray-200 ${
                errors.address ? "border-red-500" : ""
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
      Total Shares
    </Label>

    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600">
        Total: {totalSharesSum.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Share Classes</span>
        <Switch
          checked={useClassShares}
          onCheckedChange={(checked) => {
            setUseClassShares(checked);
            setVisibleShareClasses([]);

            if (!checked) {
              // Switch to Ordinary mode: reset A, B, C to 0, keep Ordinary
              setShareClassValues((prev) => ({
                classA: 0,
                classB: 0,
                classC: 0,
                ordinary: prev.ordinary || 100,
              }));
              setShareClassErrors(getDefaultShareClassErrors());
            } else {
              // Switch to Share Classes mode: reset Ordinary to 0, enable A, B, C
              setShareClassValues((prev) => ({
                classA: prev.classA || 0,
                classB: prev.classB || 0,
                classC: prev.classC || 0,
                ordinary: 0,
              }));
              setShareClassErrors(getDefaultShareClassErrors());
              // Enable all share classes when turned ON
              setVisibleShareClasses(OPTIONAL_SHARE_CLASS_LABELS);
            }
          }}
        />
      </div>
    </div>
  </div>
            {/* Dynamic Share Class Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SHARE_CLASS_CONFIG.map(({ key, label }) => {
                const isOrdinary = key === "ordinary";
                // Show Ordinary only when useClassShares is false
                // Show A, B, C only when useClassShares is true
                const shouldRender = isOrdinary
                  ? !useClassShares
                  : useClassShares && visibleShareClasses.includes(label);

                if (!shouldRender) {
                  return null;
                }

                const value = shareClassValues[key];
                const error = shareClassErrors[key];

                return (
                  <div className="space-y-2" key={key}>
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={key}
                        className="text-gray-700 font-semibold"
                      >
                        {label}
                      </Label>
                    </div>
                    <Input
                      id={key}
                      min={0}
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
                      className={`rounded-xl border-gray-200 ${
                        error ? "border-red-500" : ""
                      }`}
                    />
                    {error && (
                      <p className="text-sm text-red-500 mt-1">{error}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {totalSharesError && (
              <p className="text-sm text-red-500">{totalSharesError}</p>
            )}
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
                totalSharesSum <= 0 ||
                !!totalSharesError ||
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
