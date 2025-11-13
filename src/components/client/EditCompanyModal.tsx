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
    
    // Validate total shares
    let sharesError = "";
    if (!formData.totalShares || formData.totalShares === 0) {
      sharesError = "Total shares must be at least 100";
    } else if (formData.totalShares < 100) {
      sharesError = "Total shares must be at least 100";
    }
    setTotalSharesError(sharesError);
    
    const nameValid = !!formData.name.trim();
    const registrationNumberValid = !!formData.registrationNumber.trim();
    const addressValid = !!formData.address.trim();
    const totalSharesValid = !sharesError && formData.totalShares >= 100;
    
    return nameValid && registrationNumberValid && addressValid && totalSharesValid;
  };

  useEffect(() => {
    if (company) {
      const companyIndustry = company.industry || "";
      const isPresetIndustry =
        companyIndustry && industryOptions.includes(companyIndustry);
      const totalShares = company.totalShares || 0;
      
      setFormData({
        name: company.name || "",
        registrationNumber: company.registrationNumber || "",
        address: company.address || "",
        status: company.status || "active",
        companyStartedAt: company.companyStartedAt
          ? company.companyStartedAt.substring(0, 10)
          : "",
        totalShares: totalShares,
        industry: isPresetIndustry
          ? companyIndustry
          : companyIndustry
          ? "Other"
          : "",
        customIndustry: isPresetIndustry ? "" : companyIndustry || "",
        description: company.description || "",
        // timelineEnd: company.timelineEnd
        //   ? company.timelineEnd.substring(0, 10)
        //   : "",
      });
      
      // Validate totalShares on load
      if (!totalShares || totalShares === 0) {
        setTotalSharesError("Total shares must be at least 100");
      } else if (totalShares < 100) {
        setTotalSharesError("Total shares must be at least 100");
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

      const payload = {
        name: formData.name,
        registrationNumber: formData.registrationNumber,
        address: formData.address,
        status: formData.status,
        companyStartedAt: formData.companyStartedAt,
        totalShares: formData.totalShares,
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

            <div className="space-y-2">
              <Label
                htmlFor="totalShares"
                className="text-gray-700 font-semibold"
              >
                Total Shares
              </Label>
              <Input
                id="totalShares"
                min={100}
                type="number"
                step={1}
                placeholder="Enter total number of shares"
                value={formData.totalShares || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  
                  if (val === "") {
                    setTotalSharesError("Total shares must be at least 100");
                    setFormData({
                      ...formData,
                      totalShares: 0,
                    });
                  } else {
                    const parsedVal = parseInt(val, 10);
                    
                    if (isNaN(parsedVal)) {
                      setTotalSharesError("Please enter a valid number");
                      setFormData({
                        ...formData,
                        totalShares: 0,
                      });
                    } else if (parsedVal < 100) {
                      setTotalSharesError("Total shares must be at least 100");
                      setFormData({
                        ...formData,
                        totalShares: parsedVal,
                      });
                    } else {
                      setTotalSharesError("");
                      setFormData({
                        ...formData,
                        totalShares: parsedVal,
                      });
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setTotalSharesError("Total shares must be at least 100");
                  } else {
                    const parsedVal = parseInt(val, 10);
                    if (isNaN(parsedVal) || parsedVal === 0) {
                      setTotalSharesError("Total shares must be at least 100");
                    } else if (parsedVal < 100) {
                      setTotalSharesError("Total shares must be at least 100");
                    } else {
                      setTotalSharesError("");
                    }
                  }
                }}
                
                className={`rounded-xl border-gray-200 ${
                  totalSharesError ? "border-red-500" : ""
                }`}
              />
              {totalSharesError && (
                <p className="text-sm text-red-500 mt-1">{totalSharesError}</p>
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
            <p className="text-xs text-gray-500">
              Choose from the list or select "Other" to enter a custom value.
            </p>
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
                !!totalSharesError ||
                !formData.totalShares ||
                formData.totalShares < 100 ||
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
