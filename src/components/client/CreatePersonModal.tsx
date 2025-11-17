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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, X } from "lucide-react";

interface CreatePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  companyId: string;
  existingShareTotal: number;
  companyTotalShares: number;
  existingSharesTotal: number;
}

const ROLES = [
  "Shareholder",
  "Director",
  "Judicial Representative",
  "Legal Representative",
  "Secretary",
];

export const CreatePersonModal: React.FC<CreatePersonModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  companyId,
  existingShareTotal,
  companyTotalShares,
  existingSharesTotal,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    roles: [] as string[],
    email: "",
    phoneNumber: "",
    sharePercentage: "",
    shares: "",
    sharesA: "",
    sharesB: "",
    sharesOrdinary: "",
    nationality: "",
    shareClass: "A",
  });
  const [supportingDocuments, setSupportingDocuments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isShareholderSelected = formData.roles.includes("Shareholder");
  const [shareTotalError, setShareTotalError] = useState<string>("");
  const [sharesTotalError, setSharesTotalError] = useState<string>("");
  const [rolesError, setRolesError] = useState<string>("");

  const [nationalityOptions, setNationalityOptions] = useState<
    { value: string; label: string; isEuropean: boolean }[
  ]>([]);

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
          const alpha2 = (entry?.cca2 || "").toUpperCase();
          const region = entry?.region || ""; // e.g., "Europe"
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

  // Local validation using existingShareTotal from parent (no API) - for percentage
  useEffect(() => {
    const newPct = isShareholderSelected ? parseFloat(formData.sharePercentage || "0") : 0;
    const projected = (existingShareTotal || 0) + (isNaN(newPct) ? 0 : newPct);
    if (projected > 100) {
      setShareTotalError(`Total share would be ${projected}%, which exceeds 100%.`);
    } else {
      setShareTotalError("");
    }
  }, [formData.sharePercentage, isShareholderSelected, existingShareTotal]);

  // Local validation for shares
  useEffect(() => {
    if (!isShareholderSelected) {
      setSharesTotalError("");
      return;
    }
    const sharesA = parseInt(formData.sharesA || "0", 10) || 0;
    const sharesB = parseInt(formData.sharesB || "0", 10) || 0;
    const sharesOrdinary = parseInt(formData.sharesOrdinary || "0", 10) || 0;
    const totalNewShares = sharesA + sharesB + sharesOrdinary;
    
    if (totalNewShares === 0) {
      setSharesTotalError("");
      return;
    }
    
    const projected = (existingSharesTotal || 0) + totalNewShares;
    if (projected > (companyTotalShares || 0)) {
      setSharesTotalError(
        `Total shares would be ${projected.toLocaleString()}, which exceeds the company's available shares of ${(companyTotalShares || 0).toLocaleString()}.`
      );
    } else {
      setSharesTotalError("");
    }
  }, [formData.sharesA, formData.sharesB, formData.sharesOrdinary, isShareholderSelected, existingSharesTotal, companyTotalShares]);

  // Calculate percentage from shares when shares are entered
  useEffect(() => {
    if (!isShareholderSelected || !companyTotalShares || companyTotalShares === 0) {
      return;
    }
    const sharesA = parseInt(formData.sharesA || "0", 10) || 0;
    const sharesB = parseInt(formData.sharesB || "0", 10) || 0;
    const sharesOrdinary = parseInt(formData.sharesOrdinary || "0", 10) || 0;
    const totalShares = sharesA + sharesB + sharesOrdinary;
    
    if (totalShares === 0) {
      setFormData((prev) => ({ ...prev, sharePercentage: "", shares: "" }));
      return;
    }
    
    const calculatedPercentage = (totalShares / companyTotalShares) * 100;
    setFormData((prev) => ({
      ...prev,
      sharePercentage: calculatedPercentage.toFixed(2),
      shares: totalShares.toString(),
    }));
  }, [formData.sharesA, formData.sharesB, formData.sharesOrdinary, isShareholderSelected, companyTotalShares]);

  // Require at least one role
  useEffect(() => {
    if ((formData.roles || []).length === 0) {
      setRolesError("Select at least one role.");
    } else {
      setRolesError("");
    }
  }, [formData.roles]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = `persons/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("engagement-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const urlData = supabase.storage
        .from("engagement-documents")
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.data.publicUrl;

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

  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        roles: [...formData.roles, role],
      });
    } else {
      setFormData({
        ...formData,
        roles: formData.roles.filter((r) => r !== role),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // roles must have at least one selection
    if ((formData.roles || []).length === 0) {
      setRolesError("Select at least one role.");
      return;
    }
    // guard by local validation (no API calls) - for percentage
    const newPct = isShareholderSelected ? parseFloat(formData.sharePercentage || "0") : 0;
    const projected = (existingShareTotal || 0) + (isNaN(newPct) ? 0 : newPct);
    if (projected > 100) {
      setShareTotalError(`Total share would be ${projected}%, which exceeds 100%.`);
      return;
    }

    // guard by local validation for shares
    if (isShareholderSelected) {
      const sharesA = parseInt(formData.sharesA || "0", 10) || 0;
      const sharesB = parseInt(formData.sharesB || "0", 10) || 0;
      const sharesOrdinary = parseInt(formData.sharesOrdinary || "0", 10) || 0;
      const totalNewShares = sharesA + sharesB + sharesOrdinary;
      
      if (totalNewShares > 0) {
        const projectedShares = (existingSharesTotal || 0) + totalNewShares;
        if (projectedShares > (companyTotalShares || 0)) {
          setSharesTotalError(
            `Total shares would be ${projectedShares.toLocaleString()}, which exceeds the company's available shares of ${(companyTotalShares || 0).toLocaleString()}.`
          );
          return;
        }
      }
      
      // Determine which class to use based on which has shares
      if (sharesA > 0) {
        setFormData((prev) => ({ ...prev, shareClass: "A" }));
      } else if (sharesB > 0) {
        setFormData((prev) => ({ ...prev, shareClass: "B" }));
      } else if (sharesOrdinary > 0) {
        setFormData((prev) => ({ ...prev, shareClass: "Ordinary" }));
      }
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      // Person is decoupled - only send person fields
      // Roles and sharePercentage are handled by the backend when companyId is provided
      const payload = {
        name: formData.name,
        address: formData.address,
        email: formData.email || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        nationality: formData.nationality || undefined,
        supportingDocuments,
        // Include roles and sharePercentage for company relationship
        roles: formData.roles.length > 0 ? formData.roles : undefined,
        sharePercentage: isShareholderSelected && formData.sharePercentage
          ? parseFloat(formData.sharePercentage)
          : undefined,
        // Note: Backend will calculate shares from percentage
        shareClass: isShareholderSelected ? formData.shareClass : undefined,
      };

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person`,
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
        throw new Error(error.message || "Failed to create person");
      }

      toast({
        title: "Success",
        description: "Person created successfully",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error creating person:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create person",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      address: "",
      roles: [],
      email: "",
      phoneNumber: "",
      sharePercentage: "",
      shares: "",
      sharesA: "",
      sharesB: "",
      sharesOrdinary: "",
      nationality: "",
      shareClass: "A",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">
            Create New Person
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700 font-semibold">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter person name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="rounded-xl border-gray-200 capitalize"
            />
          </div>
          <div className="space-y-2">
              <Label htmlFor="nationality" className="font-semibold">
                Nationality <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.nationality}
                onValueChange={(v) => setFormData({ ...formData, nationality: v })}
              >
                <SelectTrigger id="nationality" className="rounded-xl border-gray-200">
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {nationalityOptions.map((opt) => (
                    <SelectItem key={opt.label} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-700 font-semibold">
              Address <span className="text-red-500">*</span>
            </Label>
           
            <Textarea
              id="address"
              placeholder="Enter person address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="rounded-xl border-gray-200 capitalize"
              rows={2}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Roles <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {ROLES.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={formData.roles.includes(role)}
                    onCheckedChange={(checked) =>
                      handleRoleChange(role, checked as boolean)
                    }
                    className="rounded"
                  />
                  <Label
                    htmlFor={`role-${role}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {role.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                </div>
              ))}
            </div>
            {rolesError && (
              <p className="text-xs text-red-600 mt-1">{rolesError}</p>
            )}
          </div>

          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="rounded-xl border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phoneNumber"
                className="text-gray-700 font-semibold"
              >
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                placeholder="Enter phone number"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                className="rounded-xl border-gray-200"
              />
            </div>
          </div> */}

          <div className="space-y-4">
            {isShareholderSelected && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {/* Class A */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-semibold">
                      Class A
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Enter shares"
                      value={formData.sharesA}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d+$/.test(value)) {
                          setFormData({ ...formData, sharesA: value });
                        }
                      }}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  
                  {/* Class B */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-semibold">
                      Class B
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Enter shares"
                      value={formData.sharesB}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d+$/.test(value)) {
                          setFormData({ ...formData, sharesB: value });
                        }
                      }}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  
                  {/* Class C (Ordinary) */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-semibold">
                      Class C
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Enter shares"
                      value={formData.sharesOrdinary}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d+$/.test(value)) {
                          setFormData({ ...formData, sharesOrdinary: value });
                        }
                      }}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                </div>
                {sharesTotalError && (
                  <p className="text-xs text-red-600 mt-1">{sharesTotalError}</p>
                )}
                {!sharesTotalError && companyTotalShares > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Remaining shares: {Math.max(0, companyTotalShares - existingSharesTotal - 
                      (parseInt(formData.sharesA || "0", 10) || 0) - 
                      (parseInt(formData.sharesB || "0", 10) || 0) - 
                      (parseInt(formData.sharesOrdinary || "0", 10) || 0)
                    ).toLocaleString()}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Supporting Documents */}
          {/* <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Supporting Documents</Label>
            <input
              type="file"
              onChange={handleUploadFile}
              className="hidden"
              id="person-doc-upload"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            <label htmlFor="person-doc-upload">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload documents</p>
                <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</p>
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
                !formData.address ||
                !formData.nationality ||
                (formData.roles || []).length === 0 ||
                !!shareTotalError ||
                !!sharesTotalError ||
                (isShareholderSelected && (
                  (parseInt(formData.sharesA || "0", 10) || 0) === 0 &&
                  (parseInt(formData.sharesB || "0", 10) || 0) === 0 &&
                  (parseInt(formData.sharesOrdinary || "0", 10) || 0) === 0
                ))
              }
              className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Person"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

