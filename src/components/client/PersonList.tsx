import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Globe,
  Building2,
  ChevronDown,
  X,
  UserCheck,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreatePersonModal } from "./CreatePersonModal";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { EditPersonModal } from "./EditPersonModal";
import { DeletePersonConfirmation } from "./DeletePersonConfirmation";
import { AddPersonFromShareholdingModal } from "./AddPersonFromShareholdingModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Person {
  _id: string;
  name: string;
  roles: string[];
  email?: string;
  phoneNumber?: string;
  sharePercentage?: number;
  nationality?: string;
  address?: string;
  supportingDocuments?: string[];
  companyId?: string;
  companyName?: string;
  origin?: string;
  isShareholder?: boolean;
}
type PersonWithExtras = Person & Record<string, unknown>;

interface PersonListProps {
  companyId: string;
  clientId: string;
  company: any;
  onUpdate: () => void;
}

export const PersonList: React.FC<PersonListProps> = ({
  companyId,
  clientId,
  company,
  onUpdate,
}) => {
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonWithExtras | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isDeletingRepresentative, setIsDeletingRepresentative] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompanyCreateModalOpen, setIsCompanyCreateModalOpen] = useState(false);
  const [isAddCompanyDropdownOpen, setIsAddCompanyDropdownOpen] = useState(false);
  const [existingCompanies, setExistingCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [sharePercentage, setSharePercentage] = useState<string>("");
  const [shareClass, setShareClass] = useState<string>("General");
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [shareError, setShareError] = useState<string>("");
  // Company shareholder edit/delete states
  const [isEditCompanyShareOpen, setIsEditCompanyShareOpen] = useState(false);
  const [editingCompanyShare, setEditingCompanyShare] = useState<any | null>(null);
  const [isDeleteCompanyShareDialogOpen, setIsDeleteCompanyShareDialogOpen] = useState(false);
  const [companyShareToDelete, setCompanyShareToDelete] = useState<any | null>(null);
  const [isDeletingCompanyShare, setIsDeletingCompanyShare] = useState(false);
  const [isAddPersonFromShareholdingModalOpen, setIsAddPersonFromShareholdingModalOpen] = useState(false);
  const { toast } = useToast();

  const apiCompany = null;

  const fetchPersons = async () => {
    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch persons");

      const result = await response.json();
      const next = result.data || [];
      setPersons(next);
      try {
        window.dispatchEvent(
          new CustomEvent("persons-updated", { detail: next })
        );
      } catch (_) {}
    } catch (error) {
      console.error("Error fetching persons:", error);
      toast({
        title: "Error",
        description: "Failed to load persons",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch companies");

      const result = await response.json();
      const filtered = (result.data || []).filter(
        (c: any) => c._id !== companyId
      );
      setExistingCompanies(filtered);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (companyId && clientId) {
      fetchPersons();
    }
  }, [companyId, clientId]);

  useEffect(() => {
    if (isAddCompanyDropdownOpen && clientId) {
      fetchCompanies();
    }
  }, [isAddCompanyDropdownOpen, clientId]);

  const handleDeleteClick = (person: Person, isRepresentative: boolean = false) => {
    setPersonToDelete(person);
    setIsDeletingRepresentative(isRepresentative);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!personToDelete) return;

    try {
      setIsDeleting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const resolvedPersonId =
        getEntityId(personToDelete?._id) ||
        getEntityId((personToDelete as any)?.id) ||
        getEntityId(personToDelete);

      // Check if person is a representative (has companyName or is only in representationalSchema)
      const isRepresentative = isDeletingRepresentative || 
        (personToDelete as any).companyName || 
        (sortedRepresentatives.some((rep: any) => rep._id === personToDelete._id) && 
         !personShareholders.some((sh: any) => sh._id === personToDelete._id));

      let response;
      if (isRepresentative) {
        // Remove only from representationalSchema (not delete person)
        response = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/representative/${personToDelete._id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to remove representative");

        toast({
          title: "Success",
          description: "Representative removed successfully",
        });

        await maybeDeletePersonRecord(
          personToDelete,
          resolvedPersonId,
          sessionData.session.access_token
        );
      } else {
        // Remove shareholder relationship only (keep person record)
        const currentShareholders = company?.shareHolders || [];
        const targetId = resolvedPersonId;

        if (!targetId) {
          throw new Error("Unable to determine person identifier for shareholder removal");
        }

        const updatedShareholders = currentShareholders.filter((share: any) => {
          const sharePersonId = getEntityId(share?.personId);
          return sharePersonId !== targetId;
        });

        response = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              ...company,
              shareHolders: updatedShareholders,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to remove shareholder");
        }

        await removePersonFromOtherRepresentatives(targetId, sessionData.session.access_token);

        await maybeDeletePersonRecord(
          personToDelete,
          targetId,
          sessionData.session.access_token
        );

        toast({
          title: "Success",
          description: "Shareholder removed successfully",
        });
      }

      setIsDeleteDialogOpen(false);
      setPersonToDelete(null);
      setIsDeletingRepresentative(false);
      fetchPersons();
      onUpdate();
    } catch (error) {
      console.error("Error deleting person:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete person",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getPersonWithDetails = (person: PersonWithExtras | null): PersonWithExtras | null => {
    if (!person) return person;
    const personId = (person._id || (person as { id?: string }).id) as string | undefined;
    if (!personId) return person;

    const detailed = persons.find((p) => p._id === personId);
    if (!detailed) return person;

    const merged: Record<string, unknown> = {
      ...detailed,
      ...person,
    };

    const detailedRoles = Array.isArray(person.roles) && person.roles.length > 0
      ? person.roles
      : detailed.roles || [];

    return {
      ...(merged as PersonWithExtras),
      roles: detailedRoles,
      sharePercentage: person.sharePercentage ?? detailed.sharePercentage,
      address: person.address ?? detailed.address,
      nationality: person.nationality ?? detailed.nationality,
      phoneNumber: person.phoneNumber ?? detailed.phoneNumber,
      email: person.email ?? detailed.email,
      supportingDocuments: person.supportingDocuments ?? detailed.supportingDocuments,
    };
  };

  const handleEditPerson = (person: PersonWithExtras) => {
    const mergedPerson = getPersonWithDetails(person) ?? person;
    setSelectedPerson(mergedPerson);
    setIsEditModalOpen(true);
  };

  const calculateShareValidation = (selectedId: string, sharePct: number) => {
    const currentPersonTotal = persons.reduce((acc, p) => {
      const pct = typeof p?.sharePercentage === "number" ? p.sharePercentage : 0;
      return acc + pct;
    }, 0);

    const currentShareholdings = company?.shareHoldingCompanies || [];
    const existingIndex = currentShareholdings.findIndex((s: any) => {
      if (!s || !s.companyId) return false;
      const shareCompanyId =
        typeof s.companyId === "string" ? s.companyId : s.companyId._id;
      return shareCompanyId === selectedId;
    });

    let currentCompanyTotal = 0;
    currentShareholdings.forEach((share: any, idx: number) => {
      if (existingIndex >= 0 && idx === existingIndex) {
        return;
      }
      const sharePct =
        share?.sharesData?.percentage ?? share?.sharePercentage;
      const numPct = typeof sharePct === "number" ? sharePct : 0;
      if (!isNaN(numPct) && numPct > 0) {
        currentCompanyTotal += numPct;
      }
    });

    const newTotal = currentPersonTotal + currentCompanyTotal + sharePct;
    const available = Math.max(
      0,
      100 - (currentPersonTotal + currentCompanyTotal)
    );

    return {
      currentPersonTotal,
      currentCompanyTotal,
      newTotal,
      available,
      wouldExceed: newTotal > 100,
    };
  };

  const handleAddShareholdingCompany = async () => {
    setShareError("");

    if (!selectedCompanyId || !sharePercentage) {
      setShareError("Please select a company and enter share percentage");
      toast({
        title: "Error",
        description: "Please select a company and enter share percentage",
        variant: "destructive",
      });
      return;
    }


    const sharePct = parseFloat(sharePercentage);
    if (isNaN(sharePct) || sharePct <= 0 || sharePct > 100) {
      setShareError("Share percentage must be between 0 and 100");
      toast({
        title: "Error",
        description: "Share percentage must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    // Validate total shares don't exceed 100%
    const validation = calculateShareValidation(selectedCompanyId, sharePct);
    
    if (validation.wouldExceed) {
      setShareError(`Total shares cannot exceed 100%. Maximum available: ${validation.available.toFixed(2)}%`);
      toast({
        title: "Error",
        description: `Total shares cannot exceed 100%. Maximum available: ${validation.available.toFixed(2)}%`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingShare(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const currentShareholdings = company?.shareHoldingCompanies || [];
      const existingIndex = currentShareholdings.findIndex(
        (s: any) => 
          (typeof s.companyId === 'string' && s.companyId === selectedCompanyId) ||
          (typeof s.companyId === 'object' && s.companyId._id === selectedCompanyId)
      );

      let updatedShareholdings; 
      if (existingIndex >= 0) {
        // Update existing shareholding - preserve existing sharesData structure
        updatedShareholdings = [...currentShareholdings];
        const existing = currentShareholdings[existingIndex];
        updatedShareholdings[existingIndex] = {
          companyId: selectedCompanyId,
          sharesData: {
            ...(existing?.sharesData || {}),
            percentage: sharePct,
            class: shareClass || "General",
          },
        };
      } else {
        // Add new shareholding
        updatedShareholdings = [
          ...currentShareholdings,
          {
            companyId: selectedCompanyId,
            sharesData: {
              percentage: sharePct,
              class: shareClass || "General",
            },
          },
        ];
      }

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            ...company,
            shareHoldingCompanies: updatedShareholdings,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add shareholding company");
      }

      toast({
        title: "Success",
        description: "Shareholding company added successfully",
      });

      // Reset form
      setSelectedCompanyId("");
      setSharePercentage("");
      setShareClass("General");
      setShareError("");
      setIsAddCompanyDropdownOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error adding shareholding company:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add shareholding company",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingShare(false);
    }
  };

  const handleOpenNewCompanyModal = () => {
    setIsAddCompanyDropdownOpen(false);
    setIsCompanyCreateModalOpen(true);
  };

  // Handle edit company shareholder
  const handleEditCompanyShare = async (share: any) => {
    setEditingCompanyShare(share);
    const normalizedCompanyId = typeof share.companyId === 'object' && share.companyId !== null
      ? share.companyId._id
      : share.companyId;
    setSelectedCompanyId(normalizedCompanyId);
    setSharePercentage(share.sharePercentage?.toString() || "");
    setShareClass(share.shareClass || "General");
    setShareError("");
    setIsEditCompanyShareOpen(true);
    // Fetch companies list if not already loaded
    if (existingCompanies.length === 0) {
      await fetchCompanies();
    }
  };

  // Handle update company shareholder
  const handleUpdateCompanyShare = async () => {
    if (!editingCompanyShare || !selectedCompanyId || !sharePercentage) {
      setShareError("Please select a company and enter share percentage");
      toast({
        title: "Error",
        description: "Please select a company and enter share percentage",
        variant: "destructive",
      });
      return;
    }

    const sharePct = parseFloat(sharePercentage);
    if (isNaN(sharePct) || sharePct <= 0 || sharePct > 100) {
      setShareError("Share percentage must be between 0 and 100");
      toast({
        title: "Error",
        description: "Share percentage must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    // Validate total shares don't exceed 100%
    // For editing, we need to exclude the original shareholding being edited
    const currentPersonTotal = (company?.shareHolders || []).reduce((acc: number, shareHolder: any) => {
      const pct = shareHolder?.sharesData?.percentage || 0;
      return acc + (isNaN(pct) ? 0 : pct);
    }, 0);

    const currentShareholdings = company?.shareHoldingCompanies || [];
    const originalShareCompanyId = typeof editingCompanyShare.companyId === 'object' 
      ? editingCompanyShare.companyId._id 
      : editingCompanyShare.companyId;
    
    // Calculate company total excluding the one being edited
    let currentCompanyTotal = 0;
    currentShareholdings.forEach((share: any) => {
      const shareCompanyId = typeof share.companyId === 'object' ? share.companyId._id : share.companyId;
      // Skip the shareholding being edited
      if (shareCompanyId?.toString() === originalShareCompanyId?.toString()) {
        return;
      }
      const sharePct = share?.sharesData?.percentage ?? share?.sharePercentage;
      const numPct = typeof sharePct === "number" ? sharePct : 0;
      if (!isNaN(numPct) && numPct > 0) {
        currentCompanyTotal += numPct;
      }
    });

    const newTotal = currentPersonTotal + currentCompanyTotal + sharePct;
    const available = Math.max(0, 100 - (currentPersonTotal + currentCompanyTotal));
    
    if (newTotal > 100) {
      setShareError(`Total shares cannot exceed 100%. Maximum available: ${available.toFixed(2)}%`);
      toast({
        title: "Error",
        description: `Total shares cannot exceed 100%. Maximum available: ${available.toFixed(2)}%`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingShare(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const currentShareholdings = company?.shareHoldingCompanies || [];
      const editingCompanyIdNormalized = typeof editingCompanyShare.companyId === 'object'
        ? editingCompanyShare.companyId._id
        : editingCompanyShare.companyId;
      const existingIndex = currentShareholdings.findIndex(
        (s: any) => {
          const shareCompanyId = typeof s.companyId === 'object' ? s.companyId._id : s.companyId;
          return shareCompanyId?.toString() === editingCompanyIdNormalized?.toString();
        }
      );

      let updatedShareholdings;
      if (existingIndex >= 0) {
        // Update existing shareholding - preserve existing sharesData structure
        updatedShareholdings = [...currentShareholdings];
        const existing = currentShareholdings[existingIndex];
        updatedShareholdings[existingIndex] = {
          companyId: selectedCompanyId,
          sharesData: {
            ...(existing?.sharesData || {}),
            percentage: sharePct,
            class: shareClass || "General",
          },
        };
      } else {
        // This shouldn't happen, but handle it anyway
        updatedShareholdings = [
          ...currentShareholdings,
          {
            companyId: selectedCompanyId,
            sharesData: {
              percentage: sharePct,
              class: shareClass || "General",
            },
          },
        ];
      }

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            ...company,
            shareHoldingCompanies: updatedShareholdings,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update shareholding company");
      }

      toast({
        title: "Success",
        description: "Shareholding company updated successfully",
      });

      // Reset form
      setSelectedCompanyId("");
      setSharePercentage("");
      setShareClass("General");
      setShareError("");
      setEditingCompanyShare(null);
      setIsEditCompanyShareOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error("Error updating shareholding company:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update shareholding company",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingShare(false);
    }
  };

  // Handle delete company shareholder click
  const handleDeleteCompanyShareClick = (share: any) => {
    setCompanyShareToDelete(share);
    setIsDeleteCompanyShareDialogOpen(true);
  };

  // Handle delete company shareholder confirm
  const handleDeleteCompanyShareConfirm = async () => {
    if (!companyShareToDelete) return;

    try {
      setIsDeletingCompanyShare(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const currentShareholdings = company?.shareHoldingCompanies || [];
      const deleteCompanyId = typeof companyShareToDelete.companyId === 'object' && companyShareToDelete.companyId !== null
        ? companyShareToDelete.companyId._id
        : companyShareToDelete.companyId;
      const updatedShareholdings = currentShareholdings.filter((s: any) => {
        const shareCompanyId = typeof s.companyId === 'object' ? s.companyId._id : s.companyId;
        return shareCompanyId?.toString() !== deleteCompanyId?.toString();
      });

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            ...company,
            shareHoldingCompanies: updatedShareholdings,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to delete shareholding company");

      toast({
        title: "Success",
        description: "Shareholding company removed successfully",
      });

      setIsDeleteCompanyShareDialogOpen(false);
      setCompanyShareToDelete(null);
      onUpdate();
    } catch (error) {
      console.error("Error deleting shareholding company:", error);
      toast({
        title: "Error",
        description: "Failed to delete shareholding company",
        variant: "destructive",
      });
    } finally {
      setIsDeletingCompanyShare(false);
    }
  };

  // Handle navigate to company details
  const handleNavigateToCompany = (companyIdToNavigate: string) => {
    navigate(`/employee/clients/${clientId}/company/${companyIdToNavigate}`);
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "Shareholder") return "bg-blue-100 text-blue-700 border-blue-200";
    if (role === "Director") return "bg-green-100 text-green-700 border-green-200";
    if (role === "Judicial Representative") return "bg-amber-100 text-amber-700 border-amber-200";
    if (role === "Legal Representative") return "bg-red-100 text-red-700 border-red-200";
    if (role === "Secretary") return "bg-gray-100 text-gray-700 border-gray-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  function getEntityId(entity: any): string | undefined {
    if (!entity) return undefined;
    if (typeof entity === "string") return entity;
    if (typeof entity === "object") {
      return entity._id || entity.id || entity.value;
    }
    return undefined;
  }

  async function removePersonFromOtherRepresentatives(
    personId: string,
    accessToken: string
  ) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch companies for representative cleanup");
      }

      const result = await response.json();
      const companies: any[] = Array.isArray(result?.data) ? result.data : [];

      const updates = companies
        .filter((c) => c && c._id && c._id !== companyId && Array.isArray(c.representationalSchema))
        .map(async (companyItem) => {
          const currentSchema = companyItem.representationalSchema || [];
          const filteredSchema = currentSchema.filter((entry: any) => {
            const entryId =
              getEntityId(entry?.personId?._id) ||
              getEntityId(entry?.personId?.id) ||
              getEntityId(entry?.personId);
            return entryId !== personId;
          });

          if (filteredSchema.length === currentSchema.length) {
            return;
          }

          await fetch(
            `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyItem._id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                ...companyItem,
                representationalSchema: filteredSchema,
              }),
            }
          );
        });

      await Promise.all(updates);
    } catch (error) {
      console.error("Error removing person from other representatives:", error);
    }
  }

  async function maybeDeletePersonRecord(
    person: Person | null | undefined,
    personId: string | undefined,
    accessToken: string
  ) {
    if (!personId) return;
    if (!person) return;

    const origin = (person as any)?.origin;
    if (origin === "ShareholdingCompany") return;

    try {
      const companyResponse = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!companyResponse.ok) {
        throw new Error("Failed to verify company state for person deletion");
      }

      const companyResult = await companyResponse.json();
      const updatedCompany = companyResult?.data;

      const stillShareholder = Array.isArray(updatedCompany?.shareHolders)
        ? updatedCompany.shareHolders.some((share: any) => {
            const sharePersonId = getEntityId(share?.personId);
            const sharePct = share?.sharesData?.percentage ?? share?.sharePercentage ?? 0;
            return sharePersonId === personId && Number(sharePct) > 0;
          })
        : false;

      if (stillShareholder) {
        return;
      }

      const stillRepresentative = Array.isArray(updatedCompany?.representationalSchema)
        ? updatedCompany.representationalSchema.some((entry: any) => {
            const entryId =
              getEntityId(entry?.personId?._id) ||
              getEntityId(entry?.personId?.id) ||
              getEntityId(entry?.personId);
            return entryId === personId;
          })
        : false;

      if (stillRepresentative) {
        return;
      }

      const deleteResponse = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person/${personId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json().catch(() => ({}));
        throw new Error(error?.message || "Failed to delete person record");
      }
    } catch (error) {
      console.error("Failed to delete person record if unused:", error);
    }
  }

  const isFromShareholdingCompany = (person: Partial<Person> | null | undefined) => {
    if (!person) return false;
    if (person.origin === "ShareholdingCompany") return true;
    if (typeof person.companyName === "string" && person.companyName.trim().length > 0) return true;
    return false;
  };

  // Calculate share totals - count all persons with shares and all companies
  // Use company.shareHolders directly for person totals
  const shareTotals = {
    personTotal: (company?.shareHolders || []).reduce((acc: number, shareHolder: any) => {
      const pct = shareHolder?.sharesData?.percentage || 0;
      return acc + (isNaN(pct) ? 0 : pct);
    }, 0),
    companyTotal: (company?.shareHoldingCompanies || []).reduce((acc: number, share: any) => {
      // Handle both old format (sharePercentage) and new format (sharesData.percentage)
      const pct = share?.sharesData?.percentage ?? share?.sharePercentage;
      const numPct = typeof pct === "number" ? pct : 0;
      return acc + (isNaN(numPct) || numPct <= 0 ? 0 : numPct);
    }, 0),
  };

  const getNormalizedShareClass = (shareClass: unknown) => {
    if (typeof shareClass !== "string") return "";
    return shareClass.trim().toUpperCase();
  };

  const getShareClassPriority = (shareClass: unknown) => {
    const normalized = getNormalizedShareClass(shareClass);
    if (normalized === "CLASS A" || normalized === "A") return 0;
    if (!normalized || normalized === "CLASS GENERAL" || normalized === "GENERAL") return 3;
    if (normalized === "CLASS B" || normalized === "B") return 2;
    return 1;
  };

  const getNumericPercentage = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const compareShareholderEntries = (
    a: { shareClass?: string; sharePercentage?: number; name?: string; companyName?: string },
    b: { shareClass?: string; sharePercentage?: number; name?: string; companyName?: string }
  ) => {
    const shareDiff =
      getNumericPercentage(b.sharePercentage) - getNumericPercentage(a.sharePercentage);
    if (shareDiff !== 0) return shareDiff;
    const classDiff = getShareClassPriority(a.shareClass) - getShareClassPriority(b.shareClass);
    if (classDiff !== 0) return classDiff;
    const nameA = (a.name || a.companyName || "").toLowerCase();
    const nameB = (b.name || b.companyName || "").toLowerCase();
    return nameA.localeCompare(nameB);
  };

  const rawPersonShareholders = useMemo(
    () =>
      (company?.shareHolders || []).map((shareHolder: any) => {
        const personData = shareHolder.personId || {};
        const sharesData = shareHolder.sharesData || {};
        const totalshares = (company.totalShares/100)*sharesData.percentage;
        return {
          ...personData,
          sharePercentage: getNumericPercentage(sharesData.percentage),
          totalShares: getNumericPercentage(totalshares),
          shareClass: sharesData.class,
          origin: "PersonShareholder",
          isShareholder: true,
        };
      }),
    [company?.shareHolders]
  );

  const highestSharePerson = useMemo(() => {
    return rawPersonShareholders.reduce((best: any | null, current: any) => {
      if (!best) return current;
      return (current?.sharePercentage ?? 0) > (best?.sharePercentage ?? 0) ? current : best;
    }, null);
  }, [rawPersonShareholders]);

  const personShareholders = useMemo(
    () => [...rawPersonShareholders].sort(compareShareholderEntries),
    [rawPersonShareholders]
  );

  // Get person shareholder IDs for sorting representatives
  const personShareholderIds = new Set(
    personShareholders
      .map((sh: any) => getEntityId(sh?._id) || getEntityId(sh?.id) || getEntityId(sh))
      .filter(Boolean)
  );

  const isUBO = (person: Person): { isUBO: boolean; companyName?: string } => {
    if (!highestSharePerson) return { isUBO: false };
    const isUltimateBeneficialOwner = highestSharePerson._id === person._id;
    return {
      isUBO: isUltimateBeneficialOwner,
      companyName: isUltimateBeneficialOwner ? company?.name : undefined,
    };
  };

  // Get representatives from company.representationalSchema directly
  // Representatives are persons with roles EXCEPT those who ONLY have "Shareholder" role
  // role is now an array of strings in the schema
  const representatives = (company?.representationalSchema || [])
    .map((rep: any) => {
      const personData = rep.personId || {};
      // role is already an array of strings
      const roles = Array.isArray(rep.role) ? rep.role : (rep.role ? [rep.role] : []);
      // Get companyId if person is from a shareholding company
      const companyIdData = rep.companyId || null;
      const companyName = companyIdData?.name || null;
      const repPersonId = getEntityId(personData);
      const linkedPersonId =
        repPersonId ||
        getEntityId(rep?.personId) ||
        getEntityId(personData?._id) ||
        getEntityId((personData as any)?.id);
      return {
        ...personData,
        roles: roles,
        companyId: companyIdData?._id || companyIdData || null,
        companyName: companyName,
        origin: companyName ? "ShareholdingCompany" : "DirectPerson",
        isShareholder: Boolean(linkedPersonId && personShareholderIds.has(linkedPersonId)),
      };
    })
    .filter((person: any) => {
      // Include if person has roles other than just "Shareholder"
      const roles = person.roles || [];
      return roles.length > 0 && !(roles.length === 1 && roles[0] === "Shareholder");
    });

  const representativeIdSet = useMemo(() => {
    const ids = new Set<string>();
    (company?.representationalSchema || []).forEach((rep: any) => {
      const personData = rep.personId || {};
      const repId =
        getEntityId(personData?._id) ||
        getEntityId(personData?.id) ||
        getEntityId(rep?.personId);
      if (repId) {
        ids.add(repId);
      }
    });
    return ids;
  }, [company?.representationalSchema]);

  const existingRepresentativeIds = useMemo(() => Array.from(representativeIdSet), [representativeIdSet]);

  // Sort representatives: person shareholders first, then people from shareholding companies
  // Within each group, maintain UBO priority (UBO appears first)
  const sortedRepresentatives = [...representatives].sort((a: any, b: any) => {
    // UBO always comes first
    if (highestSharePerson) {
      const highestId = highestSharePerson._id || highestSharePerson.id;
      const aId = a._id || a.id;
      const bId = b._id || b.id;
      const aIsHighest = aId === highestId;
      const bIsHighest = bId === highestId;
      if (aIsHighest && !bIsHighest) return -1;
      if (!aIsHighest && bIsHighest) return 1;
    }

    // Check if person is a person shareholder (exists in personShareholders)
    const aIsPersonShareholder = personShareholderIds.has(a._id || a.id);
    const bIsPersonShareholder = personShareholderIds.has(b._id || b.id);

    // Person shareholders come before people from shareholding companies
    if (aIsPersonShareholder && !bIsPersonShareholder) return -1;
    if (!aIsPersonShareholder && bIsPersonShareholder) return 1;

    // Within same group, maintain alphabetical order by name
    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });


    // Check if there are shareholding companies
  
    // For now, if person has a role and there are shareholding companies, 
    // we'll mark as potential UBO with the first shareholding company name
    // In production, you'd want to check if the person is actually associated with that company
 
 

  // Get shareholding companies data with proper structure
  // Sort by share class priority, then share percentage (desc), then name
  const shareholdingCompanies = useMemo(
    () =>
      (company?.shareHoldingCompanies || [])
        .map((share: any) => {
          const sharePercentage = getNumericPercentage(
            share?.sharesData?.percentage ?? share?.sharePercentage
          );
          const totalShares = getNumericPercentage(share?.sharesData?.totalShares);
          const companyName = share.companyId?.name || share.companyId || "Unknown Company";
          // Handle companyId - check if it's an object and not null before accessing _id
          const companyId =
            share.companyId && typeof share.companyId === "object" && share.companyId !== null
              ? share.companyId._id
              : share.companyId;
          const shareClass = share?.sharesData?.class;
          return {
            companyId,
            companyName,
            sharePercentage,
            totalShares,
            shareClass,
            registrationNumber: share.companyId?.registrationNumber,
          };
        })
        .filter((share: any) => share.companyId !== null && share.companyId !== undefined) // Filter out invalid entries
        .sort((a, b) => {
          const primaryDiff = compareShareholderEntries(a, b);
          if (primaryDiff !== 0) return primaryDiff;
          return b.totalShares - a.totalShares;
        }),
    [company?.shareHoldingCompanies]
  );

  const combinedShareholders = useMemo(
    () =>
      [
        ...personShareholders.map((person: any) => ({
          type: "person" as const,
          displayName: person.name ?? "Unknown",
          shareClass: person.shareClass,
          sharePercentage: getNumericPercentage(person.sharePercentage),
          totalShares: getNumericPercentage(person.totalShares),
          payload: person,
        })),
        ...shareholdingCompanies.map((companyShare: any) => ({
          type: "company" as const,
          displayName: companyShare.companyName ?? "Unknown Company",
          shareClass: companyShare.shareClass,
          sharePercentage: getNumericPercentage(companyShare.sharePercentage),
          totalShares: getNumericPercentage(companyShare.totalShares),
          payload: companyShare,
        })),
      ].sort((a, b) => {
        const shareDiff = b.sharePercentage - a.sharePercentage;
        if (shareDiff !== 0) return shareDiff;
        const classDiff = getShareClassPriority(a.shareClass) - getShareClassPriority(b.shareClass);
        if (classDiff !== 0) return classDiff;
        return a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase());
      }),
    [personShareholders, shareholdingCompanies]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-hover rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Representatives & Shareholders</h3>
              <p className="text-sm text-gray-600">
                Manage individuals and companies associated with this company
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Person
            </Button>
            {shareholdingCompanies.length > 0 && (
              <Button
                onClick={() => setIsAddPersonFromShareholdingModalOpen(true)}
                size="sm"
                variant="outline"
                className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
              >
                <Users className="h-4 w-4 mr-2" />
                Add Person from Shareholding Companies
              </Button>
            )}
                      <Popover 
            open={isAddCompanyDropdownOpen} 
            onOpenChange={(open) => {
              setIsAddCompanyDropdownOpen(open);
              if (!open) {
                // Reset form when closing
                setSelectedCompanyId("");
                setSharePercentage("");
                setShareClass("General");
                setShareError("");
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button 
                size="sm" 
                className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Company
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-96 p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Add Shareholding Company</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsAddCompanyDropdownOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Company Selection */}
                <div className="space-y-2">
                  <Label htmlFor="company-select" className="text-sm font-medium text-gray-700">
                    Company
                  </Label>
                  <Select
                    value={selectedCompanyId}
                    onValueChange={(value) => {
                      setSelectedCompanyId(value);
                      setShareError("");
                    }}
                  >
                    <SelectTrigger id="company-select" className="rounded-lg">
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {existingCompanies.length === 0 ? (
                        <SelectItem value="no-companies" disabled>
                          No companies available
                        </SelectItem>
                      ) : (
                        existingCompanies.map((comp) => (
                          <SelectItem key={comp._id} value={comp._id}>
                            {comp.name}
                            {comp.registrationNumber && ` (${comp.registrationNumber})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Share Percentage */}
                <div className="space-y-2">
                  <Label htmlFor="share-percentage" className="text-sm font-medium text-gray-700">
                    Share Percentage
                  </Label>
                  <Input
                    id="share-percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0.00"
                    value={sharePercentage}
                    onChange={(e) => {
                      setSharePercentage(e.target.value);
                      setShareError("");
                      // Real-time validation
                      const value = e.target.value;
                      if (value && selectedCompanyId) {
                        const sharePct = parseFloat(value);
                        if (!isNaN(sharePct)) {
                          const validation = calculateShareValidation(selectedCompanyId, sharePct);
                          if (validation.wouldExceed) {
                            setShareError(`Total shares cannot exceed 100%. Maximum available: ${validation.available.toFixed(2)}%`);
                          }
                        }
                      }
                    }}
                    className={`rounded-lg ${shareError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                  />
                  {shareError && (
                    <p className="text-sm text-red-600 mt-1">{shareError}</p>
                  )}
                  {/* Show available percentage */}
                  {!shareError && sharePercentage && selectedCompanyId && (
                    (() => {
                      const sharePct = parseFloat(sharePercentage) || 0;
                      if (isNaN(sharePct)) return null;
                      const validation = calculateShareValidation(selectedCompanyId, sharePct);
                      return (
                        <p className="text-xs text-gray-500 mt-1">
                          Total after adding: {validation.newTotal.toFixed(2)}% / 100%
                          {validation.available < 100 && ` (Available: ${validation.available.toFixed(2)}%)`}
                        </p>
                      );
                    })()
                  )}
                </div>

                {/* Done Button */}
                <Button
                  type="button"
                  onClick={handleAddShareholdingCompany}
                  disabled={isSubmittingShare || !selectedCompanyId || !sharePercentage}
                  className="w-full bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
                >
                  {isSubmittingShare ? "Adding..." : "Done"}
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                  </div>
                </div>

                {/* Add New Company Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenNewCompanyModal}
                  className="w-full rounded-xl border-gray-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Company
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="representatives" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="representatives" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Representatives
            </TabsTrigger>
            <TabsTrigger value="shareholders" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Shareholders
            </TabsTrigger>
          </TabsList>

          {/* Representatives Tab */}
          <TabsContent value="representatives" className="space-y-4 mt-6 h-80 overflow-y-auto">
             {sortedRepresentatives.length > 0 ? (
              <div className="space-y-4">
                {sortedRepresentatives.map((person) => {
                  const uboInfo = isUBO(person);
                  // roles is already an array, filter out "Shareholder" role
                  const rolesArray = Array.isArray(person.roles) 
                    ? person.roles.filter((r: string) => r !== "Shareholder")
                    : [];
                  const isShareholdingCompanyPerson = isFromShareholdingCompany(person);
                    
                  return (
                    <Card
                      key={person._id || person.id}
                      className="bg-white/80 border border-white/50 rounded-xl shadow-sm hover:bg-white/70 transition-all"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-1">
                                  <h4 className="text-lg font-semibold capitalize">
                                  {person.name}
                                  </h4>

                                  {person.companyName && (
                                  <div className="flex items-center gap-1 text-gray-600">
                                  <span className="text-sm italic font-medium">(from)</span>
                                  <Badge
                                  variant="outline"
                                  className="rounded-xl px-3 py-1 text-xs font-semibold bg-brand-hover text-white border-brand-hover"
                                  >
                                  {person.companyName}
                                  </Badge>
                                  </div>
                                  )}
                              </div>
                              {uboInfo.isUBO && (
                                <Badge
                                  variant="outline"
                                  className="bg-purple-100 text-purple-700 border-purple-200 rounded-xl px-3 py-1 text-xs font-semibold"
                                >
                                  UBO
                                </Badge>
                              )}
                            </div>

                            {/* Roles (excluding Shareholder) */}
                            {rolesArray.length > 0 && (
                              <div className="flex flex-wrap gap-3 mb-3">
                                {rolesArray.map((role: string, index: number) => (
                                  <Badge
                                    key={`${person._id || person.id}-role-${index}`}
                                    variant="outline"
                                    className={`rounded-xl px-2 py-1 text-xs font-semibold ${getRoleBadgeVariant(role)}`}
                                  >
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* UBO Company Name */}
                            {uboInfo.isUBO && uboInfo.companyName && (
                              <div className="text-xs text-gray-500 mb-2">
                                Company: {uboInfo.companyName}
                              </div>
                            )}

                            {/* Address and Nationality */}
                            <div className="space-y-2">
                              {person.address && (
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                  <span className="text-xs">{person.address}</span>
                                </div>
                              )}
                              {person.nationality && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Globe className="h-4 w-4" />
                                  <span>{person.nationality}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            {isShareholdingCompanyPerson ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPerson(person)}
                                  className="rounded-xl hover:bg-gray-100"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(person, true)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPerson(person)}
                                  className="rounded-xl hover:bg-gray-100"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(person, true)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No representatives yet</p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Person
                </Button>
              </div>
            )}
           </TabsContent>

          {/* Shareholders Tab */}
          <TabsContent value="shareholders" className="space-y-4 mt-6 h-80 overflow-y-auto">
            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-900">Shareholders</h4>
              <p className="text-sm text-gray-600">
                Individuals and companies holding shares in this company 
              </p>
            </div>
              
            {combinedShareholders.length > 0 ? (
              <div className="space-y-4">
                {combinedShareholders.map((entry, index) => {
                  if (entry.type === "person") {
                    const person = entry.payload;
                    const totalShares = entry.totalShares;
                    const sharePercentage = entry.sharePercentage;
                    const shareClass = entry.shareClass || "General";
                    return (
                      <Card
                        key={person._id || person.id || `person-shareholder-${index}`}
                        className="bg-white/80 border border-white/50 rounded-xl shadow-sm hover:bg-white/70 transition-all"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h4 className="text-lg font-semibold text-gray-900 capitalize">
                                  {person.name}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-700 border-green-200 rounded-xl px-3 py-1 text-sm font-semibold"
                                >
                                  {shareClass}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-700 border-green-200 rounded-xl px-3 py-1 text-sm font-semibold"
                                >
                                  {totalShares.toLocaleString()} shares ({sharePercentage}%)
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                {person.address && (
                                  <div className="flex items-start gap-2 text-sm text-gray-600">
                                    <span className="text-xs">{person.address}</span>
                                  </div>
                                )}
                                {person.nationality && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Globe className="h-4 w-4" />
                                    <span>{person.nationality}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPerson(person)}
                                className="rounded-xl hover:bg-gray-100"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(person, false)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  const share = entry.payload;
                  return (
                    <Card
                      key={share.companyId || `company-shareholder-${index}`}
                      className="bg-white/80 border border-white/50 rounded-xl shadow-sm hover:bg-white/70 transition-all"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => handleNavigateToCompany(share.companyId)}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <Building2 className="h-5 w-5 text-gray-600" />
                              <h4 className="text-lg font-semibold text-gray-900 hover:text-brand-hover transition-colors">
                                {share.companyName}
                              </h4>
                              {share.shareClass && (
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-700 border-green-200 rounded-xl px-3 py-1 text-sm font-semibold"
                                >
                                  {share.shareClass}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className="bg-blue-100 text-blue-700 border-blue-200 rounded-xl px-3 py-1 text-sm font-semibold"
                              >
                                {share.totalShares.toLocaleString()} shares ({share.sharePercentage}
                                %)
                              </Badge>
                            </div>
                            {share.registrationNumber && (
                              <div className="text-sm text-gray-600">
                                Registration: {share.registrationNumber}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCompanyShare(share);
                              }}
                              className="rounded-xl hover:bg-gray-100"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCompanyShareClick(share);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Percent className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No shareholders yet</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Person
                  </Button>
                  <Button
                    onClick={() => setIsAddCompanyDropdownOpen(true)}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Person Modal */}
      <CreatePersonModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchPersons();
          onUpdate();
        }}
        clientId={clientId}
        companyId={companyId}
        existingShareTotal={shareTotals.personTotal + shareTotals.companyTotal}
      />

      {/* Edit Person Modal */}
      <EditPersonModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPerson(null);
        }}
        person={selectedPerson}
        clientId={clientId}
        companyId={companyId}
        existingShareTotal={shareTotals.personTotal + shareTotals.companyTotal}
        onSuccess={() => {
          setIsEditModalOpen(false);
          setSelectedPerson(null);
          fetchPersons();
          onUpdate();
        }}
      />

      {/* Delete Person Confirmation Dialog */}
      <DeletePersonConfirmation
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setPersonToDelete(null);
          setIsDeletingRepresentative(false);
        }}
        onConfirm={handleDeleteConfirm}
        personName={personToDelete?.name || ""}
        isLoading={isDeleting}
      />

      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={isCompanyCreateModalOpen}
        onClose={() => setIsCompanyCreateModalOpen(false)}
        onSuccess={() => {
          setIsCompanyCreateModalOpen(false);
          // Refresh companies list and parent component
          fetchCompanies();
          onUpdate();
        }}
        clientId={clientId}
        existingCompanies={existingCompanies}
      />

      {/* Edit Company Shareholder Dialog */}
      <Dialog 
        open={isEditCompanyShareOpen} 
        onOpenChange={(open) => {
          setIsEditCompanyShareOpen(open);
          if (!open) {
            // Reset form when closing
            setSelectedCompanyId("");
            setSharePercentage("");
            setShareClass("General");
            setShareError("");
            setEditingCompanyShare(null);
          }
        }}
      >
        <DialogContent className="max-w-md p-0">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Edit Shareholding Company</h4>
              {/* <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsEditCompanyShareOpen(false)}
              >
               
              </Button> */}
            </div>

            {/* Company Selection */}
            <div className="space-y-2">
              <Label htmlFor="edit-company-select" className="text-sm font-medium text-gray-700">
                Company <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedCompanyId}
                onValueChange={(value) => {
                  setSelectedCompanyId(value);
                  setShareError("");
                }}
              >
                <SelectTrigger id="edit-company-select" className="rounded-lg">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {existingCompanies.length === 0 ? (
                    <SelectItem value="no-companies" disabled>
                      No companies available
                    </SelectItem>
                  ) : (
                    existingCompanies.map((comp) => (
                      <SelectItem key={comp._id} value={comp._id}>
                        {comp.name}
                        {comp.registrationNumber && ` (${comp.registrationNumber})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Share Percentage */}
            <div className="space-y-2">
              <Label htmlFor="edit-share-percentage" className="text-sm font-medium text-gray-700">
                Share Percentage <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-share-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0.00"
                value={sharePercentage}
                onChange={(e) => {
                  setSharePercentage(e.target.value);
                  setShareError("");
                  // Real-time validation for editing
                  const value = e.target.value;
                  if (value && selectedCompanyId && editingCompanyShare) {
                    const sharePct = parseFloat(value);
                    if (!isNaN(sharePct)) {
                      // Calculate excluding the original shareholding being edited
                      const currentPersonTotal = (company?.shareHolders || []).reduce((acc: number, shareHolder: any) => {
                        const pct = shareHolder?.sharesData?.percentage || 0;
                        return acc + (isNaN(pct) ? 0 : pct);
                      }, 0);

                      const currentShareholdings = company?.shareHoldingCompanies || [];
                      const originalShareCompanyId = typeof editingCompanyShare.companyId === 'object'
                        ? editingCompanyShare.companyId._id
                        : editingCompanyShare.companyId;
                      
                      let currentCompanyTotal = 0;
                      currentShareholdings.forEach((share: any) => {
                        const shareCompanyId = typeof share.companyId === 'object' ? share.companyId._id : share.companyId;
                        if (shareCompanyId?.toString() === originalShareCompanyId?.toString()) {
                          return; // Skip the one being edited
                        }
                        const sharePct = share?.sharesData?.percentage ?? share?.sharePercentage;
                        const numPct = typeof sharePct === "number" ? sharePct : 0;
                        if (!isNaN(numPct) && numPct > 0) {
                          currentCompanyTotal += numPct;
                        }
                      });

                      const newTotal = currentPersonTotal + currentCompanyTotal + sharePct;
                      const available = Math.max(0, 100 - (currentPersonTotal + currentCompanyTotal));
                      
                      if (newTotal > 100) {
                        setShareError(`Total shares cannot exceed 100%. Maximum available: ${available.toFixed(2)}%`);
                      }
                    }
                  }
                }}
                className={`rounded-lg ${shareError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
              />
              {shareError && (
                <p className="text-sm text-red-600 mt-1">{shareError}</p>
              )}
              {/* Show available percentage */}
              {!shareError && sharePercentage && selectedCompanyId && editingCompanyShare && (
                (() => {
                  const sharePct = parseFloat(sharePercentage) || 0;
                  if (isNaN(sharePct)) return null;
                  
                  // Calculate excluding the original shareholding being edited
                  const currentPersonTotal = (company?.shareHolders || []).reduce((acc: number, shareHolder: any) => {
                    const pct = shareHolder?.sharesData?.percentage || 0;
                    return acc + (isNaN(pct) ? 0 : pct);
                  }, 0);

                  const currentShareholdings = company?.shareHoldingCompanies || [];
                  const originalShareCompanyId = typeof editingCompanyShare.companyId === 'object'
                    ? editingCompanyShare.companyId._id
                    : editingCompanyShare.companyId;
                  
                  let currentCompanyTotal = 0;
                  currentShareholdings.forEach((share: any) => {
                    const shareCompanyId = typeof share.companyId === 'object' ? share.companyId._id : share.companyId;
                    if (shareCompanyId?.toString() === originalShareCompanyId?.toString()) {
                      return; // Skip the one being edited
                    }
                    const sharePct = share?.sharesData?.percentage ?? share?.sharePercentage;
                    const numPct = typeof sharePct === "number" ? sharePct : 0;
                    if (!isNaN(numPct) && numPct > 0) {
                      currentCompanyTotal += numPct;
                    }
                  });

                  const newTotal = currentPersonTotal + currentCompanyTotal + sharePct;
                  const available = Math.max(0, 100 - (currentPersonTotal + currentCompanyTotal));
                  
                  return (
                    <p className="text-xs text-gray-500 mt-1">
                      Total after updating: {newTotal.toFixed(2)}% / 100%
                      {available < 100 && ` (Available: ${available.toFixed(2)}%)`}
                    </p>
                  );
                })()
              )}
            </div>

            {/* Share Class */}
            <div className="space-y-2">
              <Label htmlFor="edit-share-class" className="text-sm font-medium text-gray-700">
                Class <span className="text-red-500">*</span>
              </Label>
              <Select
                value={shareClass}
                onValueChange={(value) => {
                  setShareClass(value);
                  setShareError("");
                }}
              >
                <SelectTrigger id="edit-share-class" className="rounded-lg">
                  <SelectValue placeholder="Select share class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="Ordinary">Ordinary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Done Button */}
            <Button
              type="button"
              onClick={handleUpdateCompanyShare}
              disabled={isSubmittingShare || !selectedCompanyId || !sharePercentage}
              className="w-full bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
            >
              {isSubmittingShare ? "Updating..." : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Company Shareholder Confirmation Dialog */}
      <Dialog 
        open={isDeleteCompanyShareDialogOpen} 
        onOpenChange={(open) => !open && !isDeletingCompanyShare && setIsDeleteCompanyShareDialogOpen(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Remove Shareholding Company
              </DialogTitle>
            </div>
          </DialogHeader>

          <DialogDescription className="text-gray-600 py-4">
            Are you sure you want to remove <span className="font-semibold text-gray-900">{companyShareToDelete?.companyName}</span> as a shareholding company?
            This action cannot be undone and will permanently remove this shareholding relationship.
          </DialogDescription>

          <DialogFooter className="flex gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteCompanyShareDialogOpen(false)}
              disabled={isDeletingCompanyShare}
              className="rounded-xl flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCompanyShareConfirm}
              disabled={isDeletingCompanyShare}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl flex-1"
            >
              {isDeletingCompanyShare ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Person from Shareholding Companies Modal */}
      <AddPersonFromShareholdingModal
        isOpen={isAddPersonFromShareholdingModalOpen}
        onClose={() => setIsAddPersonFromShareholdingModalOpen(false)}
        onSuccess={() => {
          setIsAddPersonFromShareholdingModalOpen(false);
          fetchPersons();
          onUpdate();
        }}
        clientId={clientId}
        companyId={companyId}
        shareholdingCompanies={shareholdingCompanies.map((share) => ({
          companyId: share.companyId,
          companyName: share.companyName,
        }))}
        existingRepresentativeIds={existingRepresentativeIds}
      />
    </>
  );
};

