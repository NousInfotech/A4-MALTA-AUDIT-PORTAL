import { useState, useEffect, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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

interface EditPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any;
  clientId: string;
  companyId: string;
  onSuccess: () => void;
  existingShareTotal?: number;
}

const ALL_ROLES = [
  "Shareholder",
  "Director",
  "Judicial Representative",
  "Legal Representative",
  "Secretary",
];

export const EditPersonModal: React.FC<EditPersonModalProps> = ({
  isOpen,
  onClose,
  person,
  clientId,
  companyId,
  onSuccess,
  existingShareTotal = 0,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    roles: [] as string[],
    email: "",
    phoneNumber: "",
    sharePercentage: "",
    nationality: "",
  });
  const [supportingDocuments, setSupportingDocuments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [shareTotalError, setShareTotalError] = useState<string>("");
  const [nationalityOptions, setNationalityOptions] = useState<
    { value: string; label: string; isEuropean: boolean }[]
  >([]);
  const originType: string | undefined = person?.origin;
  const isShareholderContext = originType === "PersonShareholder";
  const isShareholdingCompanyPerson =
    originType === "ShareholdingCompany" || (!!person?.companyName && !isShareholderContext);
  const isRepresentativeContext = !isShareholderContext;
  const isCurrentShareholder = Boolean(person?.isShareholder);
  const originalSharePercentage = Number(
    typeof person?.sharePercentage === "number"
      ? person.sharePercentage
      : person?.sharePercentage
      ? parseFloat(person.sharePercentage)
      : 0
  ) || 0;
  const hasShareholderRole = formData.roles.includes("Shareholder");
  const availableRoles = useMemo(() => {
    const roles = ALL_ROLES.filter((role) => {
      if (role === "Shareholder") {
        if (isShareholdingCompanyPerson) return false;
        if (isShareholderContext) return false;
        if (isCurrentShareholder) return false;
      }
      return true;
    });

    if (isRepresentativeContext || isShareholderContext) {
      return roles;
    }

    return [];
  }, [isShareholdingCompanyPerson, isShareholderContext, isRepresentativeContext, isCurrentShareholder]);

  const shouldShowRolesSection =
    (isRepresentativeContext || isShareholderContext) && availableRoles.length > 0;

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

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = `persons/${Date.now()}-${file.name}`;
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

  useEffect(() => {
    if (person) {
      const initialRoles = Array.isArray(person.roles)
        ? person.roles.filter((role: string) => {
            if (!isRepresentativeContext) return true;
            if (role === "Shareholder" && (isShareholdingCompanyPerson || isCurrentShareholder)) {
              return false;
            }
            return true;
          })
        : [];

      setFormData({
        name: person.name || "",
        address: person.address || "",
        roles: initialRoles,
        email: person.email || "",
        phoneNumber: person.phoneNumber || "",
        sharePercentage: person.sharePercentage?.toString() || "",
        nationality: person.nationality || "",
      });
      setSupportingDocuments(person.supportingDocuments || []);
    }
  }, [person]);

  useEffect(() => {
    if (isShareholdingCompanyPerson) {
      setShareTotalError("");
      return;
    }

    if (!(isShareholderContext || hasShareholderRole)) {
      setShareTotalError("");
      return;
    }

    const enteredShare = parseFloat(formData.sharePercentage || "0");
    const sanitizedShare = isNaN(enteredShare) ? 0 : enteredShare;
    const baseTotal = Math.max(0, (existingShareTotal || 0) - originalSharePercentage);
    const projected = baseTotal + sanitizedShare;

    if (projected > 100) {
      setShareTotalError(
        `Total share would be ${projected.toFixed(2)}%, which exceeds 100%.`
      );
    } else {
      setShareTotalError("");
    }
  }, [
    existingShareTotal,
    formData.sharePercentage,
    hasShareholderRole,
    isShareholderContext,
    isShareholdingCompanyPerson,
    originalSharePercentage,
  ]);

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        if (prev.roles.includes(role)) return prev;
        return {
          ...prev,
          roles: [...prev.roles, role],
        };
      }

      return {
        ...prev,
        roles: prev.roles.filter((r) => r !== role),
        sharePercentage: role === "Shareholder" ? "" : prev.sharePercentage,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      if (isShareholdingCompanyPerson) {
        if (formData.roles.length === 0) {
          throw new Error("Please assign at least one role");
        }

        if (!formData.name || !formData.address || !formData.nationality) {
          throw new Error("Please fill in all required fields (Name, Address, Nationality)");
        }

        // First, update the person data
        const personId = person?._id || person?.id;
        if (!personId) {
          throw new Error("Person ID not found");
        }

        const personPayload = {
          name: formData.name,
          address: formData.address,
          nationality: formData.nationality,
          email: formData.email || undefined,
          phoneNumber: formData.phoneNumber || undefined,
        };

        const personUpdateResponse = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person/${personId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify(personPayload),
          }
        );

        if (!personUpdateResponse.ok) {
          const error = await personUpdateResponse.json();
          throw new Error(error.message || "Failed to update person data");
        }

        // Then, update the roles in representationalSchema
        const companyResponse = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
          {
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
          }
        );

        if (!companyResponse.ok) {
          throw new Error("Failed to load company data");
        }

        const companyResult = await companyResponse.json();
        const currentCompany = companyResult.data;

        if (!currentCompany) {
          throw new Error("Company data not available");
        }

        const representationalSchema = Array.isArray(currentCompany.representationalSchema)
          ? currentCompany.representationalSchema
          : [];

        let entryUpdated = false;
        const updatedSchema = representationalSchema.map((entry: any) => {
          const entryPersonId = entry?.personId?._id || entry?.personId;
          const currentPersonId = person?._id || person?.id;
          if (entryPersonId === currentPersonId) {
            entryUpdated = true;
            return {
              ...entry,
              role: formData.roles,
            };
          }
          return entry;
        });

        if (!entryUpdated) {
          throw new Error("Unable to locate person entry for role update");
        }

        const updateResponse = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              ...currentCompany,
              representationalSchema: updatedSchema,
            }),
          }
        );

        if (!updateResponse.ok) {
          const error = await updateResponse.json();
          throw new Error(error.message || "Failed to update roles");
        }

        toast({
          title: "Success",
          description: "Person updated successfully",
        });

        onSuccess();
      } else {
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
          sharePercentage: formData.sharePercentage
            ? parseFloat(formData.sharePercentage)
            : undefined,
        };

        const response = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person/${person._id}`,
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
          throw new Error(error.message || "Failed to update person");
        }

        toast({
          title: "Success",
          description: "Person updated successfully",
        });

        onSuccess();
      }
    } catch (error: any) {
      console.error("Error updating person:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update person",
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
            {isShareholdingCompanyPerson ? "Edit Person" : "Edit Person"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {isShareholdingCompanyPerson && person?.companyName && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-600">
                Editing {person.name} from {person.companyName}
              </div>
            </div>
          )}
          
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
              <Label htmlFor="nationality" className="text-gray-700 font-semibold">
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

          {shouldShowRolesSection && (
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Roles <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {availableRoles.map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={formData.roles.includes(role)}
                      onCheckedChange={(checked) =>
                        handleRoleChange(role, checked === true)
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
            </div>
          )}

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

          {/* Share Percentage - Optional for representatives */}
          {(!isShareholdingCompanyPerson && (isShareholderContext || hasShareholderRole)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="sharePercentage"
                  className="text-gray-700 font-semibold"
                >
                  Share Percentage <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sharePercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Enter share percentage"
                  value={formData.sharePercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, sharePercentage: e.target.value })
                  }
                  className="rounded-xl border-gray-200"
                  required
                />
                {shareTotalError && (
                  <p className="text-xs text-red-600 mt-1">{shareTotalError}</p>
                )}
              </div>
            </div>
          )}

          {/* Supporting Documents */}
          {/* <div className="space-y-2">
            <Label className="text-gray-700 font-semibold">Supporting Documents</Label>
            <input
              type="file"
              onChange={handleUploadFile}
              className="hidden"
              id="edit-person-doc-upload"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            <label htmlFor="edit-person-doc-upload">
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
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (isRepresentativeContext && formData.roles.length === 0) ||
                (!isShareholderContext && (
                  !formData.name ||
                  !formData.nationality ||
                  !formData.address
                )) ||
                ((isShareholderContext || hasShareholderRole) && !formData.sharePercentage) ||
                !!shareTotalError
              }
              className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Person"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

