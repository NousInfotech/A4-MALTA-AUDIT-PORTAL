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
import {
  ShareClassInput,
  type ShareClassValues,
  type ShareClassErrors,
  getDefaultShareClassValues,
  getDefaultShareClassErrors,
  buildTotalSharesPayload,
  calculateTotalSharesSum,
} from "@/components/client/ShareClassInput";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, X, Plus } from "lucide-react";
import { useParams } from "react-router-dom";

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




interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  existingCompanies?: any[];
  isShareholdingCompany?: boolean;
  parentCompanyId?: string;
  parentCompany?: any;
  existingShareTotal?: number;
}

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  existingCompanies = [],
  isShareholdingCompany = false,
  parentCompanyId,
  parentCompany,
  existingShareTotal = 0,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    registrationNumber: "",
    address: "",
    status: "active",
    timelineStart: "",
    timelineEnd: "",
    totalShares: "",
    shareClassValues: getDefaultShareClassValues(),
    industry: "",
    customIndustry: "",
    description: "",
    sharePercentage: "",
    shareClass: "General",
  });
  const [supportingDocuments, setSupportingDocuments] = useState<string[]>([]);
  const [shareHoldingCompanies, setShareHoldingCompanies] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sharePercentageError, setSharePercentageError] = useState<string>("");

 const [shareClassErrors, setShareClassErrors] = useState(getDefaultShareClassErrors());
  const { toast } = useToast();
  const params = useParams();
  const companyId = params.companyId as string;
  const resolvedIndustry = (
    formData.industry === "Other"
      ? formData.customIndustry
      : formData.industry
  ).trim();
  const totalSharesPayload = buildTotalSharesPayload(formData.shareClassValues);
  const totalSharesSum = calculateTotalSharesSum(formData.shareClassValues);
  const hasShareClassErrors = Object.values(shareClassErrors).some(Boolean);


 


  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        registrationNumber: "",
        address: "",
        status: "active",
        timelineStart: "",
        timelineEnd: "",
        totalShares: "",
        shareClassValues: getDefaultShareClassValues(),
        industry: "",
        customIndustry: "",
        description: "",
        sharePercentage: "",
        shareClass: "General",
      });
      setSupportingDocuments([]);
      setShareHoldingCompanies([]);
      setSharePercentageError("");
      setShareClassErrors(getDefaultShareClassErrors());
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      // Validate share percentage if creating as shareholding company
      if (isShareholdingCompany) {
        if (!formData.sharePercentage || formData.sharePercentage.trim() === "") {
          setSharePercentageError("Share percentage is required");
          setIsSubmitting(false);
          return;
        }

        const sharePct = parseFloat(formData.sharePercentage);
        if (isNaN(sharePct) || sharePct <= 0 || sharePct > 100) {
          setSharePercentageError("Share percentage must be between 0 and 100");
          setIsSubmitting(false);
          return;
        }

        // Validate total shares don't exceed 100%
        const available = 100 - existingShareTotal;
        if (sharePct > available) {
          setSharePercentageError(
            `Total shares cannot exceed 100%. Maximum available: ${available.toFixed(2)}%`
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Build payload with all share classes (filtered to only include values > 0)
      const payload = {
        name: formData.name,
        registrationNumber: formData.registrationNumber,
        address: formData.address,
        status: formData.status,
        timelineStart: formData.timelineStart,
        timelineEnd: formData.timelineEnd || undefined,
        totalShares: totalSharesPayload,
        authorizedShares: formData.shareClassValues?.authorizedShares,
        issuedShares: formData.shareClassValues?.issuedShares,
        perShareValue: {
          value: formData.shareClassValues?.perShareValue,
          currency: "EUR",
        },
        industry: resolvedIndustry || undefined,
        description: formData.description.trim() || undefined,
        supportingDocuments,
        shareHoldingCompanies: shareHoldingCompanies.filter(
          (s) => s.companyId && s.sharePercentage > 0
        ),
      };

      // Debug: Log the payload
      console.log("Total shares payload:", totalSharesPayload);

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create company");
      }

      const result = await response.json();
      const newCompanyId = result.data?._id || result.data?.id;

      // If creating as shareholding company, add it to parent company
      if (isShareholdingCompany && parentCompanyId && newCompanyId && formData.sharePercentage) {
        const sharePct = parseFloat(formData.sharePercentage);
        
        // Fetch current parent company data
        const companyResponse = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${parentCompanyId}`,
          {
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
          }
        );

        if (!companyResponse.ok) {
          throw new Error("Failed to fetch parent company");
        }

        const companyResult = await companyResponse.json();
        const currentCompany = companyResult.data || parentCompany || {};

        // Update shareHoldingCompanies array
        const currentShareholdings = currentCompany.shareHoldingCompanies || [];
        const updatedShareholdings = [
          ...currentShareholdings,
          {
            companyId: newCompanyId,
            sharesData: {
              percentage: sharePct,
              class: formData.shareClass || "General",
            },
          },
        ];

        // Update parent company
        const updateResponse = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${parentCompanyId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              ...currentCompany,
              shareHoldingCompanies: updatedShareholdings,
            }),
          }
        );

        if (!updateResponse.ok) {
          const error = await updateResponse.json();
          throw new Error(error.message || "Failed to add shareholding company");
        }

        toast({
          title: "Success",
          description: "Company created and added as shareholding company successfully",
        });
      } else {
        toast({
          title: "Success",
          description: "Company created successfully",
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error creating company:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create company",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      registrationNumber: "",
      address: "",
      status: "active",
      timelineStart: "",
      timelineEnd: "",
      totalShares: "",
      shareClassValues: getDefaultShareClassValues(),
      industry: "",
      customIndustry: "",
      description: "",
      sharePercentage: "",
      shareClass: "General",
    });
    setSupportingDocuments([]);
    setShareHoldingCompanies([]);
    setSharePercentageError("");
    setShareClassErrors(getDefaultShareClassErrors());
  };
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = `companies/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("engagement-documents")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("engagement-documents")
        .getPublicUrl(fileName);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">
            Create New Company
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-semibold">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter company name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="rounded-xl border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="registrationNumber"
                className="text-gray-700 font-semibold"
              >
                Registration Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="registrationNumber"
                placeholder="Enter registration number"
                value={formData.registrationNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registrationNumber: e.target.value,
                  })
                }
                className="rounded-xl border-gray-200"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-700 font-semibold">
              Address <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="address"
              placeholder="Enter company address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="rounded-xl border-gray-200"
              rows={3}
              required
            />
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
                htmlFor="timelineStart"
                className="text-gray-700 font-semibold"
              >
                Company Start Date
              </Label>
              <Input
                id="timelineStart"
                type="date"
                value={formData.timelineStart}
                onChange={(e) =>
                  setFormData({ ...formData, timelineStart: e.target.value })
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
         
          <div className="space-y-2">
         
           {/* General company share inputs */}
            <ShareClassInput
              values={formData.shareClassValues}
              errors={shareClassErrors}
              onValuesChange={(values) => {
                            handleChange("shareClassValues", values);
                          }}
              onErrorChange={(errs) => setShareClassErrors(errs)}
                label="Company Total Shares"
                className="mt-2"
            />
            {/* {totalSharesError && (
              <ErrorMessage message={totalSharesError} />
            )} */}
          </div>
           {isShareholdingCompany && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sharePercentage" className="text-gray-700 font-semibold">
                    Share Percentage <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sharePercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.sharePercentage}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, sharePercentage: value });
                      setSharePercentageError("");
                      
                      // Real-time validation
                      if (value) {
                        const sharePct = parseFloat(value);
                        if (!isNaN(sharePct)) {
                          const available = 100 - existingShareTotal;
                          if (sharePct > available) {
                            setSharePercentageError(
                              `Total shares cannot exceed 100%. Maximum available: ${available.toFixed(2)}%`
                            );
                          } else if (sharePct <= 0 || sharePct > 100) {
                            setSharePercentageError("Share percentage must be between 0 and 100");
                          }
                        }
                      }
                    }}
                    className={`rounded-xl border-gray-200 ${
                      sharePercentageError ? "border-red-500" : ""
                    }`}
                  />
                  {sharePercentageError && (
                    <p className="text-sm text-red-500 mt-1">{sharePercentageError}</p>
                  )}
                  {!sharePercentageError && formData.sharePercentage && (
                    (() => {
                      const sharePct = parseFloat(formData.sharePercentage) || 0;
                      if (isNaN(sharePct)) return null;
                      const available = 100 - existingShareTotal;
                      const newTotal = existingShareTotal + sharePct;
                      return (
                        <p className="text-xs text-gray-500 mt-1">
                          Total after adding: {newTotal.toFixed(2)}% / 100%
                          {available < 100 && ` (Available: ${available.toFixed(2)}%)`}
                        </p>
                      );
                    })()
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shareClass" className="text-gray-700 font-semibold">
                    Share Class <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.shareClass}
                    onValueChange={(value) =>
                      setFormData({ ...formData, shareClass: value })
                    }
                  >
                    <SelectTrigger id="shareClass" className="rounded-xl border-gray-200">
                      <SelectValue placeholder="Select share class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="Ordinary">Ordinary</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
           )}

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
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
      
          </div> */}

          {/* Supporting Documents */}
          {/* <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Supporting Documents</Label>
            <input
              type="file"
              onChange={handleUploadFile}
              className="hidden"
              id="company-doc-upload"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
            />
            <label htmlFor="company-doc-upload">
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
          {/* {existingCompanies.length > 0 && (
            <ShareholdingCompaniesManager
              companies={existingCompanies}
              value={shareHoldingCompanies}
              onChange={setShareHoldingCompanies}
            />
          )} */}

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.name ||
                !formData.registrationNumber ||
                !formData.address ||
                hasShareClassErrors ||
                (isShareholdingCompany && (!formData.sharePercentage || !!sharePercentageError))
              }
              className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Company"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

