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
import { updateShareHolderPersonExisting } from "@/lib/api/company";
import { EditShares, type ShareValues } from "./EditShares";

interface EditPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: any;
  clientId: string;
  companyId: string;
  company?: any; // Full company object to access totalShares array
  onSuccess: () => void;
  existingShareTotal?: number;
  companyTotalShares?: number; // Keep for backward compatibility
  existingSharesTotal?: number;
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
  company,
  onSuccess,
  existingShareTotal = 0,
  companyTotalShares = 0,
  existingSharesTotal = 0,
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
    sharesC: "",
    sharesOrdinary: "", // Add Ordinary shares field
    nationality: "",
    shareClass: "",
  });
  const [sharesData, setSharesData] = useState<Array<{ class: string; type: string; totalShares: number }>>([]);
  const [supportingDocuments, setSupportingDocuments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [shareTotalError, setShareTotalError] = useState<string>("");
  const [sharesTotalError, setSharesTotalError] = useState<string>("");
  const [sharesValidationError, setSharesValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    address?: string;
    nationality?: string;
    roles?: string;
    shares?: string;
  }>({});
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
  const originalShares = Number(
    typeof person?.totalShares === "number"
      ? person.totalShares
      : person?.totalShares
      ? parseFloat(person.totalShares)
      : 0
  ) || 0;
  const hasShareholderRole = formData.roles.includes("Shareholder");
  const availableRoles = useMemo(() => {
    const roles = ALL_ROLES.filter((role) => {
      if (role === "Shareholder") {
        if (isShareholdingCompanyPerson) return false;
        if (isShareholderContext) return false;
        if (isRepresentativeContext) return false; // Hide Shareholder role when editing from Representatives tab
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
    isRepresentativeContext && availableRoles.length > 0; // Only show roles section for Representatives tab, not Shareholders tab

  // Validation function
  const validateFields = () => {
    const errors: typeof fieldErrors = {};

    // For shareholding company person: name, address, nationality are required
    if (isShareholdingCompanyPerson) {
      if (!formData.name.trim()) {
        errors.name = "Name is required";
      }
      if (!formData.address.trim()) {
        errors.address = "Address is required";
      }
      if (!formData.nationality) {
        errors.nationality = "Nationality is required";
      }
    } 
    // For non-shareholder context (representative context): name, address, nationality are required
    else if (!isShareholderContext) {
      if (!formData.name.trim()) {
        errors.name = "Name is required";
      }
      if (!formData.address.trim()) {
        errors.address = "Address is required";
      }
      if (!formData.nationality) {
        errors.nationality = "Nationality is required";
      }
    }
    // For shareholder context: name and address are still required
    else {
      if (!formData.name.trim()) {
        errors.name = "Name is required";
      }
      if (!formData.address.trim()) {
        errors.address = "Address is required";
      }
    }

    // Roles are required for representative context
    if (isRepresentativeContext && formData.roles.length === 0) {
      errors.roles = "At least one role is required";
    }

    // Shares are required for shareholder context
    if ((isShareholderContext || hasShareholderRole) && !isShareholdingCompanyPerson) {
      const sharesA = parseInt(formData.sharesA || "0", 10) || 0;
      const sharesB = parseInt(formData.sharesB || "0", 10) || 0;
      const sharesC = parseInt(formData.sharesC || "0", 10) || 0;
      const sharesOrdinary = parseInt(formData.sharesOrdinary || "0", 10) || 0;
      const totalShares = sharesA + sharesB + sharesC + sharesOrdinary;
      
      if (totalShares === 0) {
        errors.shares = "At least one share is required";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate on field changes
  useEffect(() => {
    if (formData.name || formData.address || formData.nationality || formData.roles.length > 0) {
      validateFields();
    }
  }, [formData.name, formData.address, formData.nationality, formData.roles, formData.sharesA, formData.sharesB, formData.sharesC, formData.sharesOrdinary, isShareholderContext, hasShareholderRole, isShareholdingCompanyPerson, isRepresentativeContext]);

  // Handler for share changes from EditShares component
  const handleShareChange = (shareClass: "A" | "B" | "C" | "Ordinary", value: string) => {
    if (shareClass === "Ordinary") {
      setFormData({ ...formData, sharesOrdinary: value });
    } else if (shareClass === "A") {
      setFormData({ ...formData, sharesA: value });
    } else if (shareClass === "B") {
      setFormData({ ...formData, sharesB: value });
    } else if (shareClass === "C") {
      setFormData({ ...formData, sharesC: value });
    }
  };

  // Get share values for EditShares component
  const shareValues: ShareValues = useMemo(() => ({
    sharesA: formData.sharesA,
    sharesB: formData.sharesB,
    sharesC: formData.sharesC,
    sharesOrdinary: formData.sharesOrdinary,
  }), [formData.sharesA, formData.sharesB, formData.sharesC, formData.sharesOrdinary]);

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

      // Get sharesData from person if available (from company.shareHolders)
      const personSharesData = (person as any)?.sharesData || [];
      const personTotalShares = person.totalShares ? parseInt(person.totalShares.toString(), 10) || 0 : 0;
      const personSharePercentage = person.sharePercentage || 0;
      
      // Initialize sharesData array - group by class (including Ordinary)
      const sharesByClass: Record<string, number> = { A: 0, B: 0, C: 0, Ordinary: 0 };
      
      if (Array.isArray(personSharesData) && personSharesData.length > 0) {
        personSharesData.forEach((sd: any) => {
          const shareClass = sd.class || sd.shareClass || "A";
          const shareCount = Number(sd.totalShares) || 0;
          if (shareClass in sharesByClass) {
            sharesByClass[shareClass] += shareCount;
          } else if (shareClass === "Ordinary") {
            sharesByClass.Ordinary += shareCount;
          }
        });
      } else {
        // Fallback to old format
        const personClass = person.shareClass || "A";
        if (personClass in sharesByClass) {
          sharesByClass[personClass] = personTotalShares;
        }
      }
      
      setSharesData(
        Object.entries(sharesByClass)
          .filter(([_, totalShares]) => totalShares > 0)
          .map(([class_, totalShares]) => ({
            class: class_,
            type: "Ordinary",
            totalShares: totalShares,
          }))
      );
      
      setFormData({
        name: person.name || "",
        address: person.address || "",
        roles: initialRoles,
        email: person.email || "",
        phoneNumber: person.phoneNumber || "",
        sharePercentage: personSharePercentage?.toString() || "",
        shares: personTotalShares?.toString() || "",
        sharesA: sharesByClass.A > 0 ? sharesByClass.A.toString() : "",
        sharesB: sharesByClass.B > 0 ? sharesByClass.B.toString() : "",
        sharesC: sharesByClass.C > 0 ? sharesByClass.C.toString() : "",
        sharesOrdinary: sharesByClass.Ordinary > 0 ? sharesByClass.Ordinary.toString() : "",
        nationality: person.nationality || "",
        shareClass: person.shareClass || "A",
      });
      setSupportingDocuments(person.supportingDocuments || []);
      // Clear field errors when person data is loaded
      setFieldErrors({});
    }
  }, [person]);

  useEffect(() => {
    if (isShareholdingCompanyPerson) {
      setShareTotalError("");
      setSharesTotalError("");
      return;
    }

    if (!(isShareholderContext || hasShareholderRole)) {
      setShareTotalError("");
      setSharesTotalError("");
      return;
    }

    // Percentage validation
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

    // Shares validation
    const sharesA = parseInt(formData.sharesA || "0", 10) || 0;
    const sharesB = parseInt(formData.sharesB || "0", 10) || 0;
    const sharesC = parseInt(formData.sharesC || "0", 10) || 0;
    const totalNewShares = sharesA + sharesB + sharesC;
    
    if (totalNewShares === 0) {
      setSharesTotalError("");
      return;
    }
    
    const baseSharesTotal = Math.max(0, (existingSharesTotal || 0) - originalShares);
    const projectedShares = baseSharesTotal + totalNewShares;

    if (projectedShares > (companyTotalShares || 0)) {
      setSharesTotalError(
        `Total shares would be ${projectedShares.toLocaleString()}, which exceeds the company's available shares of ${(companyTotalShares || 0).toLocaleString()}.`
      );
    } else {
      setSharesTotalError("");
    }
  }, [
    existingShareTotal,
    existingSharesTotal,
    formData.sharePercentage,
    formData.sharesA,
    formData.sharesB,
    formData.sharesC,
    hasShareholderRole,
    isShareholderContext,
    isShareholdingCompanyPerson,
    originalSharePercentage,
    originalShares,
    companyTotalShares,
  ]);

  // Calculate percentage from shares when shares are entered
  useEffect(() => {
    if (isShareholdingCompanyPerson) {
      return;
    }
    if (!(isShareholderContext || hasShareholderRole) || !companyTotalShares || companyTotalShares === 0) {
      return;
    }
    const sharesA = parseInt(formData.sharesA || "0", 10) || 0;
    const sharesB = parseInt(formData.sharesB || "0", 10) || 0;
    const sharesC = parseInt(formData.sharesC || "0", 10) || 0;
    const totalShares = sharesA + sharesB + sharesC;
    
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
  }, [formData.sharesA, formData.sharesB, formData.sharesC, isShareholderContext, hasShareholderRole, isShareholdingCompanyPerson, companyTotalShares]);

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
        shares: role === "Shareholder" ? "" : prev.shares,
        sharesA: role === "Shareholder" ? "" : prev.sharesA,
        sharesB: role === "Shareholder" ? "" : prev.sharesB,
        sharesC: role === "Shareholder" ? "" : prev.sharesC,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!validateFields()) {
      return;
    }
    
    // Validate shares before submitting
    if (!isShareholdingCompanyPerson && (isShareholderContext || hasShareholderRole)) {
      const sharesA = parseInt(formData.sharesA || "0", 10) || 0;
      const sharesB = parseInt(formData.sharesB || "0", 10) || 0;
      const sharesC = parseInt(formData.sharesC || "0", 10) || 0;
      const totalNewShares = sharesA + sharesB + sharesC;
      
      if (totalNewShares > 0) {
        const baseSharesTotal = Math.max(0, (existingSharesTotal || 0) - originalShares);
        const projectedShares = baseSharesTotal + totalNewShares;
        if (projectedShares > (companyTotalShares || 0)) {
          setSharesTotalError(
            `Total shares would be ${projectedShares.toLocaleString()}, which exceeds the company's available shares of ${(companyTotalShares || 0).toLocaleString()}.`
          );
          return;
        }
      }
    }

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
        // Person is decoupled - update person data first
        const personId = person?._id || person?.id;
        if (!personId) {
          throw new Error("Person ID not found");
        }

        const personPayload = {
          name: formData.name,
          address: formData.address,
          email: formData.email || undefined,
          phoneNumber: formData.phoneNumber || undefined,
          nationality: formData.nationality || undefined,
          supportingDocuments,
        };

        const personResponse = await fetch(
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

        if (!personResponse.ok) {
          const error = await personResponse.json();
          throw new Error(error.message || "Failed to update person");
        }

        // Update roles in representationalSchema
        if (formData.roles.length > 0) {
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

          if (currentCompany) {
            const representationalSchema = Array.isArray(currentCompany.representationalSchema)
              ? currentCompany.representationalSchema
              : [];

            let entryUpdated = false;
            const updatedSchema = representationalSchema.map((entry: any) => {
              const entryPersonId = entry?.personId?._id || entry?.personId?.id || entry?.personId;
              if (String(entryPersonId) === String(personId)) {
                entryUpdated = true;
                return {
                  ...entry,
                  role: formData.roles,
                };
              }
              return entry;
            });

            if (!entryUpdated && formData.roles.length > 0) {
              // Add new entry if not found
              updatedSchema.push({
                personId: personId,
                role: formData.roles,
              });
            }

            await fetch(
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
          }
        }

        // Update shares if person is a shareholder
        if ((isShareholderContext || hasShareholderRole) && !isShareholdingCompanyPerson) {
          const sharesA = parseInt(formData.sharesA || "0", 10) || 0;
          const sharesB = parseInt(formData.sharesB || "0", 10) || 0;
          const sharesC = parseInt(formData.sharesC || "0", 10) || 0;
          const sharesOrdinary = parseInt(formData.sharesOrdinary || "0", 10) || 0;

          // Build sharesData array (matching AddShareholderModal logic)
          const sharesDataArray: Array<{ totalShares: number; shareClass: "A" | "B" | "C" | "Ordinary"; shareType?: "Ordinary" }> = [];
          
          if (sharesA > 0) {
            sharesDataArray.push({ totalShares: sharesA, shareClass: "A", shareType: "Ordinary" });
          }
          if (sharesB > 0) {
            sharesDataArray.push({ totalShares: sharesB, shareClass: "B", shareType: "Ordinary" });
          }
          if (sharesC > 0) {
            sharesDataArray.push({ totalShares: sharesC, shareClass: "C", shareType: "Ordinary" });
          }
          if (sharesOrdinary > 0) {
            sharesDataArray.push({ totalShares: sharesOrdinary, shareClass: "Ordinary", shareType: "Ordinary" });
          }

          if (sharesDataArray.length > 0) {
            await updateShareHolderPersonExisting(clientId, companyId, String(personId), {
              sharesData: sharesDataArray,
            });
          } else {
            // Remove shareholder if all shares are 0
            await updateShareHolderPersonExisting(clientId, companyId, String(personId), {
              sharesData: [],
            });
          }
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
            
              <div className="text-sm text-gray-600">
                {person.name} from {person.companyName}
              </div>
             
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-semibold">
                Name
              </Label>
              <Input
                id="name"
                placeholder="Enter person name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={`rounded-xl border-gray-200 capitalize ${fieldErrors.name ? "border-red-500" : ""}`}
              />
              {fieldErrors.name && (
                <p className="text-sm text-red-500 mt-1">{fieldErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality" className="text-gray-700 font-semibold">
                Nationality
              </Label>
              <Select
                value={formData.nationality}
                onValueChange={(v) => setFormData({ ...formData, nationality: v })}
              >
                <SelectTrigger 
                  id="nationality" 
                  className={`rounded-xl border-gray-200 ${fieldErrors.nationality ? "border-red-500" : ""}`}
                >
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
              {fieldErrors.nationality && (
                <p className="text-sm text-red-500 mt-1">{fieldErrors.nationality}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-700 font-semibold">
              Address
            </Label>
            <Textarea
              id="address"
              placeholder="Enter person address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className={`rounded-xl border-gray-200 capitalize ${fieldErrors.address ? "border-red-500" : ""}`}
              rows={2}
            />
            {fieldErrors.address && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {shouldShowRolesSection && (
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Roles</Label>
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
              {fieldErrors.roles && (
                <p className="text-sm text-red-500 mt-1">{fieldErrors.roles}</p>
              )}
            </div>
          )}



        

          {/* Shares - Show shares by class for shareholders */}
          {(!isShareholdingCompanyPerson && (isShareholderContext || hasShareholderRole)) && (
            <div>
              <EditShares
                company={company}
                person={person}
                shareValues={shareValues}
                onShareChange={handleShareChange}
                error={sharesTotalError || sharesValidationError || undefined}
                sharePercentage={formData.sharePercentage}
                onValidationError={setSharesValidationError}
              />
              {fieldErrors.shares && (
                <p className="text-sm text-red-500 mt-1">{fieldErrors.shares}</p>
              )}
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
                Object.keys(fieldErrors).length > 0 ||
                !!shareTotalError ||
                !!sharesTotalError ||
                !!sharesValidationError
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

