import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  User,
  Loader2,
  View,
  Eye,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchCompanyById, updateCompany, removeRepresentative, updateRepresentationCompanyExisting } from "@/lib/api/company";
import { CreatePersonModal } from "./CreatePersonModal";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { EditPersonModal } from "./EditPersonModal";
import { DeletePersonConfirmation } from "./DeletePersonConfirmation";
import { AddPersonFromShareholdingModal } from "./AddPersonFromShareholdingModal";
import { AddShareholderRepresentativeModal } from "./AddShareholderRepresentativeModal";
import { AddRepresentativeModal } from "./AddRepresentativeModal";
import { AddShareholderModal } from "./AddShareholderModal";
import { EditShares, type ShareValues } from "./EditShares";
import { EditCompanyShares } from "./EditCompanyShares";
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
import Box from "@mui/material/Box";
import MuiCard from "@mui/material/Card";
import MuiCardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { EnhancedLoader } from "../ui/enhanced-loader";

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

interface ShareholdingSelection {
  companyId: string;
  companyName: string;
  sharePercent: string;
}

interface CompanyMetadata {
  clientId?: string;
  name?: string;
  registrationNumber?: string;
}

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
  const [shareholdingSelections, setShareholdingSelections] = useState<ShareholdingSelection[]>([]);
  const [shareholdingError, setShareholdingError] = useState<string>("");
  const [companySearchTerm, setCompanySearchTerm] = useState<string>("");
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [editingShareError, setEditingShareError] = useState<string>("");
  const [editingShareValidationError, setEditingShareValidationError] = useState<string | null>(null);
  const [editingShareValues, setEditingShareValues] = useState<ShareValues>({
    sharesA: "",
    sharesB: "",
    sharesC: "",
    sharesOrdinary: "",
  });
  const [isCompanyOptionsLoading, setIsCompanyOptionsLoading] = useState(false);
  const [companyLookup, setCompanyLookup] = useState<Record<string, CompanyMetadata>>({});
  const [hasFetchedCompanyOptions, setHasFetchedCompanyOptions] = useState(false);
  // Company shareholder edit/delete states
  const [isEditCompanyShareOpen, setIsEditCompanyShareOpen] = useState(false);
  const [editingCompanyShare, setEditingCompanyShare] = useState<any | null>(null);
  const [isDeleteCompanyShareDialogOpen, setIsDeleteCompanyShareDialogOpen] = useState(false);
  const [companyShareToDelete, setCompanyShareToDelete] = useState<any | null>(null);
  const [isDeletingCompanyShare, setIsDeletingCompanyShare] = useState(false);
  const [isAddPersonFromShareholdingModalOpen, setIsAddPersonFromShareholdingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"representatives" | "shareholders">("shareholders");
  const [isAddShareholderModalOpen, setIsAddShareholderModalOpen] = useState(false);
  const [isAddRepresentativeModalOpen, setIsAddRepresentativeModalOpen] = useState(false);
  const [isAddPersonRepresentativeModalOpen, setIsAddPersonRepresentativeModalOpen] = useState(false);
  const [isAddCompanyRepresentativeModalOpen, setIsAddCompanyRepresentativeModalOpen] = useState(false);
  const [isAddPersonShareholderModalOpen, setIsAddPersonShareholderModalOpen] = useState(false);
  const [isAddCompanyShareholderModalOpen, setIsAddCompanyShareholderModalOpen] = useState(false);
  const [editingPaidUpSharesPercentage, setEditingPaidUpSharesPercentage] = useState<number>(0);
  
  // Inline form state: tracks which form is currently shown inline
  // Format: "person-representative" | "company-representative" | "person-shareholder" | "company-shareholder" | null
  const [activeInlineForm, setActiveInlineForm] = useState<string | null>(null);
  
  // Company representative edit/delete states
  const [isEditCompanyRepRolesOpen, setIsEditCompanyRepRolesOpen] = useState(false);
  const [editingCompanyRep, setEditingCompanyRep] = useState<any | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [isDeleteCompanyRepDialogOpen, setIsDeleteCompanyRepDialogOpen] = useState(false);
  const [companyRepToDelete, setCompanyRepToDelete] = useState<any | null>(null);
  const [isDeletingCompanyRep, setIsDeletingCompanyRep] = useState(false);
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  
  const { toast } = useToast();

  const apiCompany = null;

  const openEditCompanyShare = (share: any) => {
    setEditingCompanyShare(share);
    setIsEditCompanyShareOpen(true);
  
    const values: ShareValues = {
      sharesA: "",
      sharesB: "",
      sharesC: "",
      sharesOrdinary: "",
    };
  
    // Fill from existing sharesData
    if (Array.isArray(share.sharesData)) {
      share.sharesData.forEach((sd: any) => {
        const shareClass = sd.shareClass || sd.class;
        const totalShares = String(sd.totalShares || "");
  
        if (shareClass === "A") values.sharesA = totalShares;
        if (shareClass === "B") values.sharesB = totalShares;
        if (shareClass === "C") values.sharesC = totalShares;
        if (shareClass === "Ordinary") values.sharesOrdinary = totalShares;
      });
    }
  
    setEditingShareValues(values);
    setEditingPaidUpSharesPercentage(share.paidUpSharesPercentage || 0);
    setEditingShareError("");
    setEditingShareValidationError(null);
  };
  

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

  // Use ref to prevent concurrent fetches
  const isFetchingCompaniesRef = useRef(false);
  const lastFetchedClientIdRef = useRef<string>('');

  const fetchCompanies = async () => {
    // Prevent concurrent fetches
    if (isFetchingCompaniesRef.current) {
      return;
    }

    // Prevent fetching for the same clientId if already fetched
    if (lastFetchedClientIdRef.current === clientId && hasFetchedCompanyOptions) {
      return;
    }

    try {
      isFetchingCompaniesRef.current = true;
      setIsCompanyOptionsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const baseUrl = import.meta.env.VITE_APIURL;
      const headers = {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      };

      const fetchCompaniesForClient = async (targetClientId: string, clientName?: string) => {
        try {
          const response = await fetch(
            `${baseUrl}/api/client/${targetClientId}/company`,
            { headers }
          );

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody?.message || "Failed to fetch companies");
          }

          const result = await response.json();
          const companies = Array.isArray(result.data) ? result.data : [];

          return companies.map((company: any) => ({
            ...company,
            clientId: targetClientId,
            clientName:
              clientName ||
              company?.clientName ||
              company?.client?.name ||
              company?.clientId?.name,
          }));
        } catch (error) {
          console.error(`Failed to fetch companies for client ${targetClientId}`, error);
          return [];
        }
      };

      const { data: clientProfiles, error: clientProfilesError } = await supabase
        .from("profiles")
        .select("user_id, name, company_name, role")
        .eq("role", "client");

      let aggregatedCompanies: any[] = [];

      if (!clientProfilesError && Array.isArray(clientProfiles) && clientProfiles.length > 0) {
        const companyRequests = clientProfiles
          .map((profile) => profile?.user_id)
          .filter((id): id is string => Boolean(id))
          .map((clientProfileId) => {
            const profile = clientProfiles.find((p) => p?.user_id === clientProfileId);
            const derivedName = profile?.company_name || profile?.name || undefined;
            return fetchCompaniesForClient(clientProfileId, derivedName);
          });

        const companiesByClient = await Promise.all(companyRequests);
        aggregatedCompanies = companiesByClient.flat();
      }

      if (aggregatedCompanies.length === 0 && clientId) {
        aggregatedCompanies = await fetchCompaniesForClient(clientId);
      }

      const deduped: any[] = [];
      const seen = new Set<string>();
      aggregatedCompanies.forEach((company) => {
        const key = company?._id || company?.id;
        if (!key || seen.has(key)) {
          return;
        }
        seen.add(key);
        deduped.push(company);
      });

      const metadata: Record<string, CompanyMetadata> = {};
      deduped.forEach((company) => {
        const id = company?._id || company?.id;
        if (!id) return;
        metadata[id] = {
          clientId: company?.clientId,
          name: company?.name,
          registrationNumber: company?.registrationNumber,
        };
      });

      setExistingCompanies(deduped);
      setCompanyLookup((prev) => ({ ...prev, ...metadata }));
      setHasFetchedCompanyOptions(true);
      lastFetchedClientIdRef.current = clientId || '';
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    } finally {
      isFetchingCompaniesRef.current = false;
      setIsCompanyOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId && clientId) {
      fetchPersons();
    }
  }, [companyId, clientId]);

  // useEffect(() => {
  //   if (clientId && !hasFetchedCompanyOptions && !isCompanyOptionsLoading) {
  //     fetchCompanies();
  //   }
  // }, [clientId, hasFetchedCompanyOptions, isCompanyOptionsLoading]);

  useEffect(() => {
    if (
      isAddCompanyDropdownOpen &&
      clientId &&
      !isCompanyOptionsLoading &&
      !hasFetchedCompanyOptions
    ) {
      fetchCompanies();
    }
  }, [
    isAddCompanyDropdownOpen,
    clientId,
    isCompanyOptionsLoading,
    hasFetchedCompanyOptions,
  ]);

  useEffect(() => {
    if (!company?.shareHoldingCompanies) return;
    const lookupUpdates: Record<string, CompanyMetadata> = {};
    company.shareHoldingCompanies.forEach((share: any) => {
      if (!share?.companyId) return;
      const companyRef = share.companyId;
      if (typeof companyRef === "object" && companyRef !== null) {
        const id = companyRef._id;
        if (!id) return;
        lookupUpdates[id] = {
          clientId: companyRef.clientId,
          name: companyRef.name,
          registrationNumber: companyRef.registrationNumber,
        };
      }
    });
    if (Object.keys(lookupUpdates).length > 0) {
      setCompanyLookup((prev) => ({ ...lookupUpdates, ...prev }));
    }
  }, [company?.shareHoldingCompanies]);

  const isCompanySelected = (companyId: string) =>
    shareholdingSelections.some((selection) => selection.companyId === companyId);

  const handleCompanySelectionToggle = (company: any) => {
    const normalizedId = getEntityId(company);
    if (!normalizedId) {
      return;
    }

    setShareholdingSelections((prev) => {
      if (isCompanySelected(normalizedId)) {
        return prev.filter((selection) => selection.companyId !== normalizedId);
      }
      return [
        ...prev,
        {
          companyId: normalizedId,
          companyName: company.name || "Unnamed Company",
          sharePercent: "",
        },
      ];
    });
    setShareholdingError("");
  };

  const handleSharePercentChange = (companyId: string, value: string) => {
    setShareholdingSelections((prev) =>
      prev.map((selection) =>
        selection.companyId === companyId ? { ...selection, sharePercent: value } : selection
      )
    );
    setShareholdingError("");
  };

  const getCompanyMetadata = (companyId?: string) => {
    if (!companyId) return undefined;
    return companyLookup[companyId];
  };

  const getCompanyClientName = (company: any): string | undefined => {
    if (!company) return undefined;
    return (
      company?.client?.name ||
      company?.clientName ||
      company?.clientId?.name ||
      company?.clientDetails?.name
    );
  };

  const filteredCompanies = useMemo(() => {
    if (!companySearchTerm.trim()) {
      return existingCompanies;
    }
    const query = companySearchTerm.trim().toLowerCase();
    return existingCompanies.filter((comp) => {
      const name = (comp?.name || "").toLowerCase();
      const registration = (comp?.registrationNumber || "").toLowerCase();
      const client = (getCompanyClientName(comp) || "").toLowerCase();
      return (
        name.includes(query) ||
        registration.includes(query) ||
        client.includes(query)
      );
    });
  }, [existingCompanies, companySearchTerm]);

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

      if (!resolvedPersonId) {
        throw new Error("Unable to determine person identifier");
      }

      const currentCompany = company || {};
      const currentShareholders = currentCompany.shareHolders || [];
      const currentRepresentationalSchema = currentCompany.representationalSchema || [];

      // Check if person is currently a shareholder
      const isCurrentlyShareholder = currentShareholders.some((share: any) => {
        const sharePersonId = getEntityId(share?.personId);
        return sharePersonId === resolvedPersonId;
      });

      // Find the representationalSchema entry for this person
      const repSchemaEntry = currentRepresentationalSchema.find((rs: any) => {
        const rsPersonId = getEntityId(rs?.personId);
        return rsPersonId === resolvedPersonId;
      });

      let updatedShareholders = [...currentShareholders];
      let updatedRepresentationalSchema = [...currentRepresentationalSchema];

      if (isDeletingRepresentative) {
        // Deleting from Representatives tab: Remove all non-shareholder roles
        // Keep "Shareholder" role if person is still a shareholder
        
        if (repSchemaEntry) {
          const currentRoles = Array.isArray(repSchemaEntry.role) 
            ? repSchemaEntry.role 
            : (repSchemaEntry.role ? [repSchemaEntry.role] : []);
          
          // Remove all non-shareholder roles (Director, Legal Representative, etc.)
          const remainingRoles = currentRoles.filter((role: string) => role === "Shareholder");
          
          // Only keep "Shareholder" role if person is still a shareholder
          if (remainingRoles.length > 0 && isCurrentlyShareholder) {
            // Update entry to keep only "Shareholder" role
            updatedRepresentationalSchema = updatedRepresentationalSchema.map((rs: any) => {
              const rsPersonId = getEntityId(rs?.personId);
              if (rsPersonId === resolvedPersonId) {
                return {
                  ...rs,
                  role: ["Shareholder"],
                };
              }
              return rs;
            });
          } else {
            // Remove entry entirely if no roles remain or person is not a shareholder
            updatedRepresentationalSchema = updatedRepresentationalSchema.filter((rs: any) => {
              const rsPersonId = getEntityId(rs?.personId);
              return rsPersonId !== resolvedPersonId;
            });
          }
        }

        toast({
          title: "Success",
          description: "Representative roles removed successfully",
        });
      } else {
        // Deleting from Shareholders tab: Remove from shareHolders AND remove "Shareholder" role only
        
        // Remove from shareHolders
        updatedShareholders = updatedShareholders.filter((share: any) => {
          const sharePersonId = getEntityId(share?.personId);
          return sharePersonId !== resolvedPersonId;
        });

        // Update representationalSchema to remove only "Shareholder" role
        if (repSchemaEntry) {
          const currentRoles = Array.isArray(repSchemaEntry.role) 
            ? repSchemaEntry.role 
            : (repSchemaEntry.role ? [repSchemaEntry.role] : []);
          
          // Remove only "Shareholder" role, keep all other roles
          const remainingRoles = currentRoles.filter((role: string) => role !== "Shareholder");
          
          if (remainingRoles.length > 0) {
            // Update entry to keep other roles
            updatedRepresentationalSchema = updatedRepresentationalSchema.map((rs: any) => {
              const rsPersonId = getEntityId(rs?.personId);
              if (rsPersonId === resolvedPersonId) {
                return {
                  ...rs,
                  role: remainingRoles,
                };
              }
              return rs;
            });
          } else {
            // Remove entry entirely if no roles remain
            updatedRepresentationalSchema = updatedRepresentationalSchema.filter((rs: any) => {
              const rsPersonId = getEntityId(rs?.personId);
              return rsPersonId !== resolvedPersonId;
            });
          }
        }

        await removePersonFromOtherRepresentatives(resolvedPersonId, sessionData.session.access_token);

        await maybeDeletePersonRecord(
          personToDelete,
          resolvedPersonId,
          sessionData.session.access_token
        );

        toast({
          title: "Success",
          description: "Shareholder removed successfully",
        });
      }

      // Update company with modified arrays
      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            ...currentCompany,
            shareHolders: updatedShareholders,
            representationalSchema: updatedRepresentationalSchema,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update company");
      }

      // Only call maybeDeletePersonRecord for representative deletion if person is no longer in schema
      if (isDeletingRepresentative) {
        const stillInSchema = updatedRepresentationalSchema.some((rs: any) => {
          const rsPersonId = getEntityId(rs?.personId);
          return rsPersonId === resolvedPersonId;
        });
        
        if (!stillInSchema) {
          await maybeDeletePersonRecord(
            personToDelete,
            resolvedPersonId,
            sessionData.session.access_token
          );
        }
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
    
    // Get sharesData from company's shareHolders for this person
    const personId = getEntityId(mergedPerson._id) || getEntityId(mergedPerson.id);
    if (personId && company?.shareHolders) {
      const shareholderEntry = company.shareHolders.find((sh: any) => {
        const shPersonId = getEntityId(sh?.personId?._id) || getEntityId(sh?.personId?.id) || getEntityId(sh?.personId);
        return String(shPersonId) === String(personId);
      });
      
      if (shareholderEntry && Array.isArray(shareholderEntry.sharesData)) {
        (mergedPerson as any).sharesData = shareholderEntry.sharesData;
        (mergedPerson as any).sharePercentage = shareholderEntry.sharePercentage;
        (mergedPerson as any).paidUpSharesPercentage = shareholderEntry.paidUpSharesPercentage;
      }
    }
    
    setSelectedPerson(mergedPerson);
    setIsEditModalOpen(true);
  };

  const handleAddShareholdingCompany = async () => {
    setShareholdingError("");

    if (shareholdingSelections.length === 0) {
      const message = "Select at least one company and provide share percentages.";
      setShareholdingError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return;
    }

    const parsedSelections = shareholdingSelections.map((selection) => ({
      ...selection,
      shareValue: parseFloat(selection.sharePercent),
    }));

    const hasInvalidShare = parsedSelections.some(
      (selection) =>
        isNaN(selection.shareValue) || selection.shareValue <= 0 || selection.shareValue > 100
    );

    if (hasInvalidShare) {
      const message = "Each selected company must have a share percentage between 0 and 100.";
      setShareholdingError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return;
    }

    const currentPersonTotal = (company?.shareHolders || []).reduce(
      (acc: number, shareHolder: any) => {
        // sharePercentage is now at the shareHolder level, not in sharesData
        const pct = shareHolder?.sharePercentage ?? 0;
        const numeric = typeof pct === "number" ? pct : Number(pct) || 0;
        return acc + (isNaN(numeric) ? 0 : numeric);
      },
      0
    );

    const currentShareholdings = company?.shareHoldingCompanies || [];
    const selectedIds = new Set(parsedSelections.map((selection) => selection.companyId));

    let currentCompanyTotal = 0;
    const retainedShareholdings = currentShareholdings.filter((share: any) => {
      const shareCompanyId =
        typeof share?.companyId === "object" && share?.companyId !== null
          ? share.companyId._id
          : share?.companyId;
      const normalizedId = shareCompanyId?.toString();

      if (normalizedId && selectedIds.has(normalizedId)) {
        return false;
      }

      // sharePercentage is now at the shareHoldingCompany level, not in sharesData
      const sharePct = share?.sharePercentage ?? 0;
      const numeric = typeof sharePct === "number" ? sharePct : Number(sharePct) || 0;
      if (!isNaN(numeric) && numeric > 0) {
        currentCompanyTotal += numeric;
      }
      return true;
    });

    const newShareTotal = parsedSelections.reduce(
      (acc, selection) => acc + (selection.shareValue || 0),
      0
    );
    const newTotal = currentPersonTotal + currentCompanyTotal + newShareTotal;

    if (newTotal > 100) {
      const available = Math.max(0, 100 - (currentPersonTotal + currentCompanyTotal));
      const message = `Total shares cannot exceed 100%. Maximum available: ${available.toFixed(
        2
      )}%`;
      setShareholdingError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingShare(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const updatedShareholdings = [
        ...retainedShareholdings,
        ...parsedSelections.map((selection) => {
          const existing = currentShareholdings.find((share: any) => {
            const shareCompanyId =
              typeof share?.companyId === "object" && share?.companyId !== null
                ? share.companyId._id
                : share?.companyId;
            return shareCompanyId?.toString() === selection.companyId;
          });

          const existingClass =
            existing?.sharesData?.class ||
            existing?.shareClass ||
            (typeof existing?.shareClass === "string" ? existing.shareClass : undefined);

          return {
            companyId: selection.companyId,
            sharesData: {
              ...(existing?.sharesData || {}),
              percentage: selection.shareValue,
              class: existingClass || "General",
            },
          };
        }),
      ];

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
            shareholdings: parsedSelections.map((selection) => ({
              companyId: selection.companyId,
              sharePercent: selection.shareValue,
            })),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add shareholding company");
      }

      toast({
        title: "Success",
        description: "Shareholding companies updated successfully",
      });

      // Reset selection
      setShareholdingSelections([]);
      setShareholdingError("");
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
 

  // Handle share change from EditShares component
  const handleCompanyShareChange = (shareClass: "A" | "B" | "C" | "Ordinary", value: string) => {
    setEditingShareValues((prev) => ({
      ...prev,
      [shareClass === "Ordinary" ? "sharesOrdinary" : `shares${shareClass}`]: value,
    }));
    setEditingShareError("");
  };

  // Handle update company shareholder
  const handleUpdateCompanyShare = async () => {
    if (!editingCompanyShare) {
      const message = "No company shareholding selected";
      setEditingShareError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return;
    }

    const sharesA = parseInt(editingShareValues.sharesA || "0", 10) || 0;
    const sharesB = parseInt(editingShareValues.sharesB || "0", 10) || 0;
    const sharesC = parseInt(editingShareValues.sharesC || "0", 10) || 0;
    const sharesOrdinary = parseInt(editingShareValues.sharesOrdinary || "0", 10) || 0;
    const totalShares = sharesA + sharesB + sharesC + sharesOrdinary;

    if (totalShares === 0) {
      const message = "Please enter at least one share";
      setEditingShareError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return;
    }

    // Validate shares don't exceed available amounts per class
    if (company?.totalShares && Array.isArray(company.totalShares)) {
      const totalSharesByClass: Record<string, number> = {};
      company.totalShares.forEach((share: any) => {
        const shareClass = share.class || "A";
        totalSharesByClass[shareClass] = Number(share.totalShares) || 0;
      });

      // Calculate allocated shares excluding current company shareholding
      const allocatedByClass: Record<string, number> = { A: 0, B: 0, C: 0, Ordinary: 0 };
      
      // From person shareholders
      if (Array.isArray(company.shareHolders)) {
        company.shareHolders.forEach((sh: any) => {
          if (Array.isArray(sh.sharesData)) {
            sh.sharesData.forEach((sd: any) => {
              const shareClass = sd.shareClass || sd.class || "A";
              allocatedByClass[shareClass] = (allocatedByClass[shareClass] || 0) + (Number(sd.totalShares) || 0);
            });
          }
        });
      }

      // From company shareholders (excluding current one being edited)
      const editingCompanyIdNormalized =
        typeof editingCompanyShare.companyId === "object"
          ? editingCompanyShare.companyId._id
          : editingCompanyShare.companyId;
      
      if (Array.isArray(company.shareHoldingCompanies)) {
        company.shareHoldingCompanies.forEach((sh: any) => {
          const shareCompanyId = typeof sh.companyId === "object" ? sh.companyId._id : sh.companyId;
          if (String(shareCompanyId) === String(editingCompanyIdNormalized)) return;
          
          if (Array.isArray(sh.sharesData)) {
            sh.sharesData.forEach((sd: any) => {
              const shareClass = sd.shareClass || sd.class || "A";
              allocatedByClass[shareClass] = (allocatedByClass[shareClass] || 0) + (Number(sd.totalShares) || 0);
            });
          }
        });
      }

      // Check if new shares exceed available
      const errors: string[] = [];
      if (sharesA > 0) {
        const available = (totalSharesByClass.A || 0) - allocatedByClass.A;
        if (sharesA > available) {
          errors.push(`Class A shares exceed available. Available: ${available.toLocaleString()}, Requested: ${sharesA.toLocaleString()}`);
        }
      }
      if (sharesB > 0) {
        const available = (totalSharesByClass.B || 0) - allocatedByClass.B;
        if (sharesB > available) {
          errors.push(`Class B shares exceed available. Available: ${available.toLocaleString()}, Requested: ${sharesB.toLocaleString()}`);
        }
      }
      if (sharesC > 0) {
        const available = (totalSharesByClass.C || 0) - allocatedByClass.C;
        if (sharesC > available) {
          errors.push(`Class C shares exceed available. Available: ${available.toLocaleString()}, Requested: ${sharesC.toLocaleString()}`);
        }
      }
      if (sharesOrdinary > 0) {
        const available = (totalSharesByClass.Ordinary || 0) - allocatedByClass.Ordinary;
        if (sharesOrdinary > available) {
          errors.push(`Ordinary shares exceed available. Available: ${available.toLocaleString()}, Requested: ${sharesOrdinary.toLocaleString()}`);
        }
      }

      if (errors.length > 0) {
        const message = errors.join("; ");
        setEditingShareError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsSubmittingShare(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const currentShareholdings = company?.shareHoldingCompanies || [];
      const editingCompanyIdNormalized =
        typeof editingCompanyShare.companyId === "object"
          ? editingCompanyShare.companyId._id
          : editingCompanyShare.companyId;
      const existingIndex = currentShareholdings.findIndex((s: any) => {
        const shareCompanyId =
          typeof s.companyId === "object" ? s.companyId._id : s.companyId;
        return shareCompanyId?.toString() === editingCompanyIdNormalized?.toString();
      });

      // Build sharesData array
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

      let updatedShareholdings;
      if (existingIndex >= 0) {
        // Update existing shareholding
        updatedShareholdings = [...currentShareholdings];
        const existing = currentShareholdings[existingIndex];
        updatedShareholdings[existingIndex] = {
          ...existing,
          sharesData: sharesDataArray,
          paidUpSharesPercentage: editingPaidUpSharesPercentage || 0,
        };
      } else {
        // This shouldn't happen, but handle it anyway
        updatedShareholdings = [
          ...currentShareholdings,
          {
            companyId: editingCompanyIdNormalized,
            sharesData: sharesDataArray,
            paidUpSharesPercentage: editingPaidUpSharesPercentage || 0,
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
      setEditingShareValues({
        sharesA: "",
        sharesB: "",
        sharesC: "",
        sharesOrdinary: "",
      });
      setEditingShareError("");
      setEditingShareValidationError(null);
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

      // Remove only the "Shareholder" role from representationalCompany
      // Keep all other representative roles intact
      const currentCompany = company || {};
      const currentRepresentationalCompany = currentCompany.representationalCompany || [];
      const updatedRepresentationalCompany = currentRepresentationalCompany
        .map((rc: any) => {
          const rcId = rc?.companyId?._id || rc?.companyId?.id || rc?.companyId;
          if (String(rcId) !== String(deleteCompanyId)) {
            return rc; // Not the company being deleted, keep as is
          }

          // This is the company being deleted - remove only "Shareholder" role
          const roles = Array.isArray(rc.role) ? rc.role : (rc.role ? [rc.role] : []);
          const remainingRoles = roles.filter((r: string) => r !== "Shareholder");

          // If no roles remain after removing "Shareholder", return null to remove entry
          if (remainingRoles.length === 0) {
            return null;
          }

          // Return entry with remaining roles (single role or array)
          return {
            ...rc,
            role: remainingRoles.length === 1 ? remainingRoles[0] : remainingRoles,
          };
        })
        .filter((rc: any) => rc !== null); // Remove entries that became null

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
            representationalCompany: updatedRepresentationalCompany,
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
  const handleNavigateToCompany = (
    companyIdToNavigate: string,
    ownerClientId?: string
  ) => {
    const metadata = getCompanyMetadata(companyIdToNavigate);
    const resolvedClientId = ownerClientId || metadata?.clientId || clientId;
    navigate(`/employee/clients/${resolvedClientId}/company/${companyIdToNavigate}`);
  };

  // Handle delete company representative click
  const handleDeleteCompanyRepClick = (repCompany: any) => {
    setCompanyRepToDelete(repCompany);
    setIsDeleteCompanyRepDialogOpen(true);
  };

  // Handle delete company representative confirm
  const handleDeleteCompanyRepConfirm = async () => {
    if (!companyRepToDelete) return;

    try {
      setIsDeletingCompanyRep(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const companyData = companyRepToDelete.companyId || {};
      const companyIdStr = typeof companyData === 'string' 
        ? companyData 
        : (companyData?._id || companyData?.id || (typeof companyData === 'object' ? String(companyData) : companyData));

      if (!companyIdStr) {
        throw new Error("Invalid company ID");
      }

      // Use updateRepresentationCompanyExisting API which preserves "Shareholder" role
      // Sending empty array will remove all representative roles but keep "Shareholder" if company is a shareholder
      await updateRepresentationCompanyExisting(
        clientId,
        companyId,
        companyIdStr,
        { role: [] }
      );

      toast({
        title: "Success",
        description: "Company representative roles removed successfully",
      });

      setIsDeleteCompanyRepDialogOpen(false);
      setCompanyRepToDelete(null);
      onUpdate();
    } catch (error: any) {
      console.error("Error removing company representative:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove company representative",
        variant: "destructive",
      });
    } finally {
      setIsDeletingCompanyRep(false);
    }
  };

  // Handle edit company representative roles
  const handleEditCompanyRep = (repCompany: any) => {
    const roles = Array.isArray(repCompany.role) ? repCompany.role : (repCompany.role ? [repCompany.role] : []);
    // Exclude Shareholder role from editing (as it's filtered out in display)
    const editableRoles = roles.filter((r: string) => r !== "Shareholder");
    setEditingRoles([...editableRoles]);
    setEditingCompanyRep(repCompany);
    setIsEditCompanyRepRolesOpen(true);
  };

  // Handle save company representative roles
  const handleSaveCompanyRepRoles = async () => {
    if (!editingCompanyRep) return;

    try {
      setIsSavingRoles(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const currentCompany = company || {};
      const representationalCompany = currentCompany.representationalCompany || [];
      
      // Find the company representative entry to update
      const companyData = editingCompanyRep.companyId || {};
      const companyIdStr = typeof companyData === 'string' 
        ? companyData 
        : (companyData?._id || companyData?.id || (typeof companyData === 'object' ? String(companyData) : companyData));

      // Update the roles in representationalCompany array
      const updatedRepresentationalCompany = representationalCompany.map((rc: any) => {
        const rcId = rc?.companyId?._id || rc?.companyId?.id || rc?.companyId;
        if (String(rcId) === String(companyIdStr)) {
          // Preserve Shareholder role if it exists, add new roles
          const existingRoles = Array.isArray(rc.role) ? rc.role : (rc.role ? [rc.role] : []);
          const hasShareholder = existingRoles.includes("Shareholder");
          const newRoles = hasShareholder ? [...editingRoles, "Shareholder"] : editingRoles;
          return {
            ...rc,
            role: newRoles.length === 1 ? newRoles[0] : newRoles,
          };
        }
        return rc;
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
            ...currentCompany,
            representationalCompany: updatedRepresentationalCompany,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update roles");
      }

      toast({
        title: "Success",
        description: "Roles updated successfully",
      });

      setIsEditCompanyRepRolesOpen(false);
      setEditingCompanyRep(null);
      setEditingRoles([]);
      onUpdate();
    } catch (error: any) {
      console.error("Error updating roles:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update roles",
        variant: "destructive",
      });
    } finally {
      setIsSavingRoles(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "Shareholder") return "bg-blue-100 text-blue-700 border-blue-200";
    if (role === "Director") return "bg-green-100 text-green-700 border-green-200";
    if (role === "Judicial Representative") return "bg-amber-100 text-amber-700 border-amber-200";
    if (role === "Legal Representative") return "bg-red-100 text-red-700 border-red-200";
    if (role === "Secretary") return "bg-gray-100 text-gray-700 border-gray-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Available roles for company representatives (excluding Shareholder)
  const COMPANY_REP_ROLES = [
    "Director",
    "Judicial Representative",
    "Legal Representative",
    "Secretary",
  ];

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

    // Safety check: Check if person is a shareholder in any of the shareholding companies
    // This handles cases where the person was added as a representative from a shareholding company
    // but the link wasn't correctly established (legacy data) or if they are just a shareholder there
    if (company?.shareHoldingCompanies && Array.isArray(company.shareHoldingCompanies)) {
      for (const shareHolding of company.shareHoldingCompanies) {
        const shareHoldingCompanyId = 
          typeof shareHolding.companyId === 'object' && shareHolding.companyId !== null
            ? shareHolding.companyId._id
            : shareHolding.companyId;
            
        if (shareHoldingCompanyId) {
          try {
            // We need to fetch the shareholding company to check its shareholders
            // We can't rely on local data as we might not have full details of shareholding companies
            const response = await fetch(
              `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${shareHoldingCompanyId}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
            
            if (response.ok) {
              const result = await response.json();
              const shareHoldingCompanyData = result.data;
              
              if (shareHoldingCompanyData?.shareHolders && Array.isArray(shareHoldingCompanyData.shareHolders)) {
                const isShareholderInLinkedCompany = shareHoldingCompanyData.shareHolders.some((sh: any) => {
                  const shPersonId = getEntityId(sh?.personId);
                  return String(shPersonId) === String(personId);
                });
                
                if (isShareholderInLinkedCompany) {
                  console.log(`Person ${personId} is a shareholder in linked company ${shareHoldingCompanyId}, skipping deletion`);
                  return;
                }
              }
            }
          } catch (err) {
            console.error(`Error checking shareholding company ${shareHoldingCompanyId} for person ${personId}`, err);
            // If we fail to check, err on the side of caution and don't delete? 
            // Or proceed? Let's proceed but log it.
          }
        }
      }
    }

    try {
      // Check if person has relationships in ANY company (not just current one)
      const allCompaniesResponse = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!allCompaniesResponse.ok) {
        throw new Error("Failed to fetch companies for person deletion check");
      }

      const allCompaniesResult = await allCompaniesResponse.json();
      const allCompanies = Array.isArray(allCompaniesResult?.data) ? allCompaniesResult.data : [];

      // Check if person is a shareholder or representative in ANY company
      let hasAnyRelationship = false;

      for (const comp of allCompanies) {
        // Check if shareholder
        const isShareholder = Array.isArray(comp?.shareHolders)
          ? comp.shareHolders.some((share: any) => {
              const sharePersonId = getEntityId(share?.personId);
              return sharePersonId === personId;
            })
          : false;

        // Check if representative
        const isRepresentative = Array.isArray(comp?.representationalSchema)
          ? comp.representationalSchema.some((entry: any) => {
              const entryId =
                getEntityId(entry?.personId?._id) ||
                getEntityId(entry?.personId?.id) ||
                getEntityId(entry?.personId);
              return entryId === personId;
            })
          : false;

        if (isShareholder || isRepresentative) {
          hasAnyRelationship = true;
          break;
        }
      }

      // Only delete if person has no relationships in any company
      if (!hasAnyRelationship) {
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
      // sharePercentage is now at the shareHolder level
      const pct = shareHolder?.sharePercentage ?? 0;
      return acc + (isNaN(pct) ? 0 : pct);
    }, 0),
    companyTotal: (company?.shareHoldingCompanies || []).reduce((acc: number, share: any) => {
      // sharePercentage is now at the shareHoldingCompany level
      const pct = share?.sharePercentage ?? 0;
      const numPct = typeof pct === "number" ? pct : 0;
      return acc + (isNaN(numPct) || numPct <= 0 ? 0 : numPct);
    }, 0),
  };

  // Calculate existing shares totals (not percentages) - sum from sharesData array
  const existingSharesTotals = {
    personTotal: (company?.shareHolders || []).reduce((acc: number, shareHolder: any) => {
      // sharesData is now an array, sum totalShares from all items
      const sharesDataArray = Array.isArray(shareHolder?.sharesData) ? shareHolder.sharesData : [];
      const total = sharesDataArray.reduce((sum: number, item: any) => {
        const shares = Number(item?.totalShares) || 0;
        return sum + (isNaN(shares) ? 0 : shares);
      }, 0);
      return acc + total;
    }, 0),
    companyTotal: (company?.shareHoldingCompanies || []).reduce((acc: number, share: any) => {
      // sharesData is now an array, sum totalShares from all items
      const sharesDataArray = Array.isArray(share?.sharesData) ? share.sharesData : [];
      const total = sharesDataArray.reduce((sum: number, item: any) => {
        const shares = Number(item?.totalShares) || 0;
        return sum + (isNaN(shares) || shares <= 0 ? 0 : shares);
      }, 0);
      return acc + total;
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
        // sharesData is now an array, sharePercentage is at shareHolder level
        const sharesDataArray = Array.isArray(shareHolder?.sharesData) ? shareHolder.sharesData : [];
        const totalShares = sharesDataArray.reduce((sum: number, item: any) => {
          return sum + (Number(item?.totalShares) || 0);
        }, 0);
        // Get shareClass from the first item in sharesData array (or use the most common one)
        const shareClass = sharesDataArray.length > 0 ? sharesDataArray[0]?.class : undefined;
        return {
          ...personData,
          sharePercentage: getNumericPercentage(shareHolder?.sharePercentage ?? 0),
          totalShares: getNumericPercentage(totalShares),
          shareClass: shareClass,
          paidUpSharesPercentage: shareHolder?.paidUpSharesPercentage,
          origin: "PersonShareholder",
          isShareholder: true,
        };
      }),
    [company?.shareHolders]
  );

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

  // Get representatives from company.representationalSchema directly
  // Representatives are persons with roles EXCEPT those who ONLY have "Shareholder" role
  // role is now an array of strings in the schema
  const representatives = useMemo(() => {
    return (company?.representationalSchema || [])
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
  }, [company?.representationalSchema, personShareholderIds]);

  // Filter company representatives to exclude those that only have "Shareholder" role
  const validCompanyRepresentatives = useMemo(() => {
    return (company?.representationalCompany || []).filter((repCompany: any) => {
      const roles = Array.isArray(repCompany.role) ? repCompany.role : (repCompany.role ? [repCompany.role] : []);
      const nonShareholderRoles = roles.filter((r: string) => r !== "Shareholder");
      return nonShareholderRoles.length > 0;
    });
  }, [company?.representationalCompany]);

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

  // State to store person relationships in other companies
  const [personRelationships, setPersonRelationships] = useState<Record<string, { shareholderIn: string[]; representativeIn: string[] }>>({});
  const [isLoadingRelationships, setIsLoadingRelationships] = useState(false);

  // Memoize representative IDs to prevent unnecessary re-fetches
  const representativeIds = useMemo(() => {
    return representatives.map((rep: any) => {
      const personId = getEntityId(rep._id) || getEntityId(rep.id);
      return personId;
    }).filter(Boolean) as string[];
  }, [representatives]);

  // Create a stable string key from representative IDs to track if we've already fetched
  const representativeIdsKey = useMemo(() => {
    return representativeIds.sort().join(',');
  }, [representativeIds]);

  // Use refs to track fetching state and prevent duplicate calls
  const isFetchingRef = useRef(false);
  const lastFetchedKeyRef = useRef<string>('');
  const lastFetchedClientIdForRelationshipsRef = useRef<string>('');

  // Fetch person relationships from other companies
  // Only fetch when representatives tab is active and we have representatives
  useEffect(() => {
    const fetchPersonRelationships = async () => {
      // Only fetch if we're on the representatives tab and have representatives
      if (activeTab !== "representatives" || representativeIds.length === 0) {
        // Reset relationships if we switch tabs
        if (activeTab !== "representatives") {
          setPersonRelationships({});
        }
        return;
      }

      // Prevent duplicate calls - check if we're already fetching
      if (isFetchingRef.current) {
        return;
      }

      // Check if we've already fetched for this exact combination
      const currentKey = `${clientId}-${companyId}-${representativeIdsKey}`;
      if (lastFetchedKeyRef.current === currentKey && lastFetchedClientIdForRelationshipsRef.current === clientId) {
        return;
      }

      try {
        isFetchingRef.current = true;
        setIsLoadingRelationships(true);
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          isFetchingRef.current = false;
          setIsLoadingRelationships(false);
          return;
        }

        // Fetch all companies for this client
        const response = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company`,
          {
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          isFetchingRef.current = false;
          setIsLoadingRelationships(false);
          return;
        }
        const result = await response.json();
        const allCompanies = result.data || [];

        const relationships: Record<string, { shareholderIn: string[]; representativeIn: string[] }> = {};

        // Create a set of person IDs for faster lookup
        const personIdSet = new Set(representativeIds);

        // Pre-process companies to create lookup maps for better performance
        const shareholderMap = new Map<string, Set<string>>(); // companyId -> Set<personId>
        const representativeMap = new Map<string, Set<string>>(); // companyId -> Set<personId>

        allCompanies.forEach((otherCompany: any) => {
          const otherCompanyId = otherCompany._id || otherCompany.id;
          if (otherCompanyId === companyId) return;

          const shareholderSet = new Set<string>();
          const representativeSet = new Set<string>();

          // Build shareholder map
          if (Array.isArray(otherCompany.shareHolders)) {
            otherCompany.shareHolders.forEach((sh: any) => {
              const shPersonId = getEntityId(sh?.personId?._id) || getEntityId(sh?.personId?.id) || getEntityId(sh?.personId);
              if (shPersonId && personIdSet.has(shPersonId)) {
                shareholderSet.add(shPersonId);
              }
            });
          }

          // Build representative map
          if (Array.isArray(otherCompany.representationalSchema)) {
            otherCompany.representationalSchema.forEach((rs: any) => {
              const rsPersonId = getEntityId(rs?.personId?._id) || getEntityId(rs?.personId?.id) || getEntityId(rs?.personId);
              if (rsPersonId && personIdSet.has(rsPersonId)) {
                representativeSet.add(rsPersonId);
              }
            });
          }

          if (shareholderSet.size > 0) {
            shareholderMap.set(otherCompanyId, shareholderSet);
          }
          if (representativeSet.size > 0) {
            representativeMap.set(otherCompanyId, representativeSet);
          }
        });

        // Now build relationships using the maps
        representativeIds.forEach((personId) => {
          relationships[personId] = {
            shareholderIn: [],
            representativeIn: [],
          };

          // Check shareholder relationships
          shareholderMap.forEach((personSet, otherCompanyId) => {
            if (personSet.has(personId)) {
              const otherCompany = allCompanies.find((c: any) => (c._id || c.id) === otherCompanyId);
              if (otherCompany?.name) {
                relationships[personId].shareholderIn.push(otherCompany.name);
              }
            }
          });

          // Check representative relationships
          representativeMap.forEach((personSet, otherCompanyId) => {
            if (personSet.has(personId)) {
              const otherCompany = allCompanies.find((c: any) => (c._id || c.id) === otherCompanyId);
              if (otherCompany?.name) {
                relationships[personId].representativeIn.push(otherCompany.name);
              }
            }
          });
        });

        setPersonRelationships(relationships);
        lastFetchedKeyRef.current = currentKey;
        lastFetchedClientIdForRelationshipsRef.current = clientId || '';
      } catch (error) {
        console.error("Error fetching person relationships:", error);
      } finally {
        isFetchingRef.current = false;
        setIsLoadingRelationships(false);
      }
    };

    if (clientId && companyId) {
      fetchPersonRelationships();
    }
  }, [clientId, companyId, activeTab, representativeIdsKey]);

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
          // sharePercentage is now at the shareHoldingCompany level
          const sharePercentage = getNumericPercentage(share?.sharePercentage ?? 0);
          // sharesData is now an array, sum totalShares from all items
          const sharesDataArray = Array.isArray(share?.sharesData) ? share.sharesData : [];
          const totalShares = getNumericPercentage(
            sharesDataArray.reduce((sum: number, item: any) => {
              return sum + (Number(item?.totalShares) || 0);
            }, 0)
          );
          const companyId =
            share.companyId && typeof share.companyId === "object" && share.companyId !== null
              ? share.companyId._id
              : share.companyId;

          if (!companyId) {
            return null;
          }

          const metadata = getCompanyMetadata(companyId);
          // Get shareClass from sharesData array (first item or most common)
          const shareClass = sharesDataArray.length > 0 ? sharesDataArray[0]?.class : undefined;
          const companyName =
            (share.companyId && typeof share.companyId === "object" && share.companyId !== null
              ? share.companyId.name
              : undefined) ||
            metadata?.name ||
            "Unknown Company";
          const registrationNumber =
            (share.companyId && typeof share.companyId === "object" && share.companyId !== null
              ? share.companyId.registrationNumber
              : undefined) || metadata?.registrationNumber;
          const companyClientId =
            (share.companyId && typeof share.companyId === "object" && share.companyId !== null
              ? share.companyId.clientId
              : undefined) || metadata?.clientId;

          return {
            companyId,
            companyName,
            sharePercentage,
            totalShares,
            shareClass,
            registrationNumber,
            clientId: companyClientId,
          };
        })
        .filter((share: any) => share && share.companyId !== null && share.companyId !== undefined)
        .sort((a, b) => {
          const primaryDiff = compareShareholderEntries(a, b);
          if (primaryDiff !== 0) return primaryDiff;
          return b.totalShares - a.totalShares;
        }),
    [company?.shareHoldingCompanies, companyLookup]
  );

  // Group shareholders by ID and aggregate all share classes
  const combinedShareholders = useMemo(() => {
    const companyTotalShares = company?.totalShares || 0;
    
    // Group person shareholders by person ID
    const personMap = new Map<string, any>();
    (company?.shareHolders || []).forEach((shareHolder: any) => {
      const personData = shareHolder.personId || {};
      const personId = personData._id || personData.id || personData;
      const personIdStr = String(personId);
      
      if (!personMap.has(personIdStr)) {
        personMap.set(personIdStr, {
          type: "person" as const,
          id: personIdStr,
          name: personData.name ?? "Unknown",
          address: personData.address,
          nationality: personData.nationality,
          sharesData: [],
          totalShares: 0,
          paidUpSharesPercentage: shareHolder.paidUpSharesPercentage,
        });
      }
      
      const personEntry = personMap.get(personIdStr)!;
      const sharesDataArray = Array.isArray(shareHolder?.sharesData) ? shareHolder.sharesData : [];
      
      // Add all share classes from this shareHolder entry
      sharesDataArray.forEach((sd: any) => {
        const shareCount = Number(sd?.totalShares) || 0;
        if (shareCount > 0) {
          const existingClass = personEntry.sharesData.find(
            (s: any) => s.class === sd.class && s.type === (sd.type || "Ordinary")
          );
          if (existingClass) {
            existingClass.totalShares += shareCount;
          } else {
            personEntry.sharesData.push({
              class: sd.class || "A",
              type: sd.type || "Ordinary",
              totalShares: shareCount,
            });
          }
          personEntry.totalShares += shareCount;
        }
      });
    });
    
    // Group company shareholders by company ID
    const companyMap = new Map<string, any>();
    (company?.shareHoldingCompanies || []).forEach((share: any) => {
      const companyId =
        share.companyId && typeof share.companyId === "object" && share.companyId !== null
          ? share.companyId._id
          : share.companyId;
      
      if (!companyId) return;
      
      const companyIdStr = String(companyId);
      const metadata = getCompanyMetadata(companyId);
      const companyName =
        (share.companyId && typeof share.companyId === "object" && share.companyId !== null
          ? share.companyId.name
          : undefined) ||
        metadata?.name ||
        "Unknown Company";
      const registrationNumber =
        (share.companyId && typeof share.companyId === "object" && share.companyId !== null
          ? share.companyId.registrationNumber
          : undefined) || metadata?.registrationNumber;
      const companyClientId =
        (share.companyId && typeof share.companyId === "object" && share.companyId !== null
          ? share.companyId.clientId
          : undefined) || metadata?.clientId;
      
      if (!companyMap.has(companyIdStr)) {
        companyMap.set(companyIdStr, {
          type: "company" as const,
          id: companyIdStr,
          companyId,
          companyName,
          registrationNumber,
          clientId: companyClientId,
          sharesData: [],
          totalShares: 0,
          paidUpSharesPercentage: typeof share.paidUpSharesPercentage === 'number' ? share.paidUpSharesPercentage : 100,
        });
      }
      
      const companyEntry = companyMap.get(companyIdStr)!;
      const sharesDataArray = Array.isArray(share?.sharesData) ? share.sharesData : [];
      
      // Add all share classes from this share entry
      sharesDataArray.forEach((sd: any) => {
        const shareCount = Number(sd?.totalShares) || 0;
        if (shareCount > 0) {
          const existingClass = companyEntry.sharesData.find(
            (s: any) => s.class === sd.class && s.type === (sd.type || "Ordinary")
          );
          if (existingClass) {
            existingClass.totalShares += shareCount;
          } else {
            companyEntry.sharesData.push({
              class: sd.class || "A",
              type: sd.type || "Ordinary",
              totalShares: shareCount,
            });
          }
          companyEntry.totalShares += shareCount;
        }
      });
    });

    // Calculate actual total shares from company.totalShares (handling array or number)
    let calculatedTotalShares = 0;
    if (Array.isArray(company?.totalShares)) {
      calculatedTotalShares = company.totalShares.reduce((sum: number, item: any) => {
        return sum + (Number(item?.totalShares) || 0);
      }, 0);
    } else {
      calculatedTotalShares = Number(company?.totalShares) || 0;
    }
    
    // Convert maps to arrays and calculate percentages
    // Filter out entries with 0 total shares
    const personEntries = Array.from(personMap.values())
      .filter(p => p.totalShares > 0)
      .map((person) => ({
        ...person,
        sharePercentage: calculatedTotalShares > 0 ? (person.totalShares / calculatedTotalShares) * 100 : 0,
      }));
    
    const companyEntries = Array.from(companyMap.values())
      .filter(c => c.totalShares > 0)
      .map((comp) => ({
        ...comp,
        sharePercentage: calculatedTotalShares > 0 ? (comp.totalShares / calculatedTotalShares) * 100 : 0,
      }));
    
    // Combine: persons first, then companies, then sort by share percentage within each group
    const sortedPersons = personEntries.sort((a, b) => {
      const shareDiff = b.sharePercentage - a.sharePercentage;
      if (shareDiff !== 0) return shareDiff;
      return (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
    });
    
    const sortedCompanies = companyEntries.sort((a, b) => {
      const shareDiff = b.sharePercentage - a.sharePercentage;
      if (shareDiff !== 0) return shareDiff;
      return (a.companyName || "").toLowerCase().localeCompare((b.companyName || "").toLowerCase());
    });
    
    return [...sortedPersons, ...sortedCompanies];
  }, [company?.shareHolders, company?.shareHoldingCompanies, company?.totalShares, companyLookup]);

  // Find highest shareholder from ALL shareholders (persons and companies)
  const highestShareholder = useMemo(() => {
    if (!combinedShareholders || combinedShareholders.length === 0) return null;
    
    return combinedShareholders.reduce((best: any | null, current: any) => {
      if (!best) return current;
      const currentPercentage = current?.sharePercentage ?? 0;
      const bestPercentage = best?.sharePercentage ?? 0;
      return currentPercentage > bestPercentage ? current : best;
    }, null);
  }, [combinedShareholders]);

  const isUBO = (person: Person): { isUBO: boolean; companyName?: string } => {
    if (!highestShareholder) return { isUBO: false };
    
    // Check if this person is the highest shareholder
    const personId = getEntityId(person._id) || getEntityId((person as any)?.id);
    const highestId = highestShareholder.type === "person" 
      ? getEntityId(highestShareholder.id)
      : null;
    
    const isUltimateBeneficialOwner = personId && highestId && personId === highestId;
    
    return {
      isUBO: isUltimateBeneficialOwner,
      companyName: isUltimateBeneficialOwner ? company?.name : undefined,
    };
  };

  // Sort representatives: person shareholders first, then people from shareholding companies
  // Within each group, maintain UBO priority (UBO appears first)
  const sortedRepresentatives = useMemo(() => {
    return [...representatives].sort((a: any, b: any) => {
      // UBO always comes first
      if (highestShareholder && highestShareholder.type === "person") {
        const highestId = getEntityId(highestShareholder.id);
        const aId = getEntityId(a._id) || getEntityId(a.id);
        const bId = getEntityId(b._id) || getEntityId(b.id);
        const aIsHighest = aId && highestId && aId === highestId;
        const bIsHighest = bId && highestId && bId === highestId;
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
  }, [representatives, highestShareholder, personShareholderIds]);

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
              <h3 className="text-lg font-semibold text-gray-900">Shareholders & Representatives</h3>
              <p className="text-sm text-gray-600">
                Manage individuals and companies associated with this company
              </p>
            </div>
          </div>
          {/* <div className="flex items-center gap-2">
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
            <Button
              size="sm"
              className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
              onClick={() => setIsAddCompanyDropdownOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Company
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
            <Dialog
              open={isAddCompanyDropdownOpen}
              onOpenChange={(open) => {
                setIsAddCompanyDropdownOpen(open);
                if (!open) {
                  setShareholdingSelections([]);
                  setShareholdingError("");
                  setCompanySearchTerm("");
                }
              }}
            >
              <DialogContent className="max-w-5xl w-[90vw] h-[90vh] p-0 overflow-hidden">
                <div className="flex flex-col h-full">
                  <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="text-xl text-gray-900">
                      Add Shareholding Companies
                    </DialogTitle>
                    <DialogDescription>
                      Select one or more companies from your workspace and assign shareholding percentages.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="px-6">
                    <Input
                      placeholder="Search companies by name, client, or registration number"
                      value={companySearchTerm}
                      onChange={(event) => setCompanySearchTerm(event.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="h-72 overflow-y-auto mt-5">
                  <div className="flex-1 overflow-hidden px-6 py-4">
                    <Box
                      data-component="grid-multi-selecting-companies-for-shareholding"
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Box
                        sx={{
                          flex: 1,
                          overflowY: "auto",
                          pr: 1,
                        }}
                      >
                        {isCompanyOptionsLoading ? (
                          <div className="flex items-center justify-center h-full text-sm text-gray-500">
                            <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
                          </div>
                        ) : filteredCompanies.length === 0 ? (
                          <div className="text-sm text-gray-500 text-center py-6">
                            No companies found.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {filteredCompanies.map((comp: any) => {
                              const companyId = getEntityId(comp);
                              if (!companyId) return null;
                              const isSelected = isCompanySelected(companyId);
                              const clientName = getCompanyClientName(comp);
                              return (
                                <div key={companyId}>
                                  <MuiCard
                                    onClick={() => handleCompanySelectionToggle(comp)}
                                    sx={{
                                      border: isSelected
                                        ? "2px solid #2563eb"
                                        : "1px solid #e5e7eb",
                                      backgroundColor: isSelected ? "#eff6ff" : "#fff",
                                      cursor: "pointer",
                                      transition: "all 0.2s ease",
                                      height: "100%",
                                    }}
                                  >
                                    <MuiCardContent sx={{ p: 2 }}>
                                      <Typography
                                        variant="subtitle2"
                                        sx={{ fontWeight: 600, mb: 0.5 }}
                                      >
                                        {comp.name || "Unnamed Company"}
                                      </Typography>
                                      {clientName && (
                                        <Typography variant="body2" color="text.secondary">
                                          Client: {clientName}
                                        </Typography>
                                      )}
                                      {comp.registrationNumber && (
                                        <Typography variant="body2" color="text.secondary">
                                          Reg: {comp.registrationNumber}
                                        </Typography>
                                      )}
                                    </MuiCardContent>
                                  </MuiCard>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Box>
                    </Box>
                  </div>
                  </div>

                  <div className="border-t px-6 py-4 space-y-3 h-[200px] overflow-y-auto">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Selected Companies
                    </Typography>
                    {shareholdingSelections.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Select companies from the grid above to assign share percentages.
                      </Typography>
                    ) : (
                      <div className="space-y-3">
                        {shareholdingSelections.map((selection) => (
                          <Box
                            key={selection.companyId}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ flex: 1, fontWeight: 500 }}
                            >
                              {selection.companyName}
                            </Typography>
                            <TextField
                              type="number"
                              label="Share %"
                              size="small"
                              value={selection.sharePercent}
                              onChange={(event) =>
                                handleSharePercentChange(selection.companyId, event.target.value)
                              }
                              inputProps={{ min: 0, max: 100, step: 0.01 }}
                              sx={{ width: 160 }}
                            />
                          </Box>
                        ))}
                      </div>
                    )}
                    {shareholdingError && (
                      <Typography variant="body2" color="error">
                        {shareholdingError}
                      </Typography>
                    )}
                    <div className="flex flex-col gap-3">
                      <Button
                        type="button"
                        onClick={handleAddShareholdingCompany}
                        disabled={isSubmittingShare || shareholdingSelections.length === 0}
                        className="w-full bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
                      >
                        {isSubmittingShare ? "Saving..." : "Save Shareholdings"}
                      </Button>
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
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div> */}
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as "shareholders" | "representatives");
            setActiveInlineForm(null); // Reset inline form when switching tabs
          }}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="shareholders" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Shareholders
            </TabsTrigger>

            <TabsTrigger value="representatives" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Representatives
            </TabsTrigger>


          </TabsList>
          {/* Show buttons at top only when there are items */}
          {((activeTab === "representatives" && (sortedRepresentatives.length > 0 || validCompanyRepresentatives.length > 0)) ||
            (activeTab === "shareholders" && combinedShareholders.length > 0)) && (
            <div className="flex gap-5 mt-4">
              {activeTab === "representatives" ? (
                <>
                  <Button
                    variant={activeInlineForm === "person-representative" ? "default" : "default"}
                    className={`flex-1 rounded-xl ${
                      activeInlineForm === "person-representative"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "border-gray-300"
                    }`}
                    onClick={() => {
                      if (activeInlineForm === "person-representative") {
                        setActiveInlineForm(null);
                      } else {
                        setActiveInlineForm("person-representative");
                      }
                    }}
                  >
                    {activeInlineForm === "person-representative" ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 mr-2" />
                        Add Person
                      </>
                    )}
                  </Button>
                  <Button
                    variant={activeInlineForm === "company-representative" ? "default" : "default"}
                    className={`flex-1 rounded-xl ${
                      activeInlineForm === "company-representative"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "border-gray-300"
                    }`}
                    onClick={() => {
                      if (activeInlineForm === "company-representative") {
                        setActiveInlineForm(null);
                      } else {
                        setActiveInlineForm("company-representative");
                      }
                    }}
                  >
                    {activeInlineForm === "company-representative" ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4 mr-2" />
                        Add Company
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={activeInlineForm === "person-shareholder" ? "default" : "default"}
                    className={`flex-1 rounded-xl ${
                      activeInlineForm === "person-shareholder"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "border-gray-300"
                    }`}
                    onClick={() => {
                      if (activeInlineForm === "person-shareholder") {
                        setActiveInlineForm(null);
                      } else {
                        setActiveInlineForm("person-shareholder");
                      }
                    }}
                  >
                    {activeInlineForm === "person-shareholder" ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 mr-2" />
                        Add Person
                      </>
                    )}
                  </Button>
                  <Button
                    variant={activeInlineForm === "company-shareholder" ? "default" : "default"}
                    className={`flex-1 rounded-xl ${
                      activeInlineForm === "company-shareholder"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "border-gray-300"
                    }`}
                    onClick={() => {
                      if (activeInlineForm === "company-shareholder") {
                        setActiveInlineForm(null);
                      } else {
                        setActiveInlineForm("company-shareholder");
                      }
                    }}
                  >
                    {activeInlineForm === "company-shareholder" ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Building2 className="h-4 w-4 mr-2" />
                        Add Company
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
          {/* Representatives Tab */}
          <TabsContent value="representatives" className="space-y-4 mt-6">
            {/* Inline Form View */}
            {(activeInlineForm === "person-representative" || activeInlineForm === "company-representative") ? (
              <div className="h-[600px] overflow-y-auto border rounded-xl p-6 bg-white">
                {activeInlineForm === "person-representative" && (
                  <AddRepresentativeModal
                    isOpen={true}
                    inline={true}
                    onClose={() => setActiveInlineForm(null)}
                    onSuccess={() => {
                      setActiveInlineForm(null);
                      fetchPersons();
                      onUpdate();
                    }}
                    clientId={clientId}
                    companyId={companyId}
                    company={company}
                    entityType="person"
                  />
                )}
                {activeInlineForm === "company-representative" && (
                  <AddRepresentativeModal
                    isOpen={true}
                    inline={true}
                    onClose={() => setActiveInlineForm(null)}
                    onSuccess={() => {
                      setActiveInlineForm(null);
                      fetchPersons();
                      onUpdate(); 
                    }}
                    clientId={clientId}
                    companyId={companyId}
                    entityType="company"
                    company={company}
                  />
                )}
              </div>
            ) : (
              <div className="h-96 overflow-y-auto">
                {isLoadingRelationships && Object.keys(personRelationships).length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading relationships...</span>
                    </div>
                  </div>
                )}
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

                            {/* Person relationships in other companies */}
                            {(() => {
                              const personId = getEntityId(person._id) || getEntityId(person.id);
                              const relationships = personId ? personRelationships[personId] : null;
                              
                              if (!relationships || (relationships.shareholderIn.length === 0 && relationships.representativeIn.length === 0)) {
                                return null;
                              }

                              return (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {relationships.shareholderIn.map((companyName: string, index: number) => (
                                    <Badge
                                      key={`shareholder-${personId}-${index}`}
                                      variant="outline"
                                      className="rounded-xl px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                      Shareholder from {companyName}
                                    </Badge>
                                  ))}
                                  {relationships.representativeIn.map((companyName: string, index: number) => (
                                    <Badge
                                      key={`representative-${personId}-${index}`}
                                      variant="outline"
                                      className="rounded-xl px-2 py-1 text-xs font-semibold bg-green-50 text-green-700 border-green-200"
                                    >
                                      Representative from {companyName}
                                    </Badge>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Address and Nationality */}
                            <div className="space-y-2">
                              {person.address && (
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                  <MapPin className="h-4 w-4" />
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
                              className="rounded-xl"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(person, true)}
                              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
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
              (sortedRepresentatives.length === 0 && validCompanyRepresentatives.length === 0) && (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No representatives yet</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => setActiveInlineForm("person-representative")}
                      className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Person
                    </Button>
                    <Button
                      onClick={() => setActiveInlineForm("company-representative")}
                      variant="outline"
                      className="rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Company
                    </Button>
                  </div>
                </div>
              )
            )}

            {/* Company Representatives Section */}
            {validCompanyRepresentatives.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-md font-semibold text-gray-900 mb-4">
                  Company Representatives
                </h4>
                <div className="space-y-4">
                  {validCompanyRepresentatives.map((repCompany: any) => {
                    const companyData = repCompany.companyId || {};
                    const roles = Array.isArray(repCompany.role) ? repCompany.role : (repCompany.role ? [repCompany.role] : []);
                    const rolesArray = roles.filter((r: string) => r !== "Shareholder");
                    // Extract company ID - handle both object and string cases
                    const companyId_rep = typeof companyData === 'string' 
                      ? companyData 
                      : (companyData?._id || companyData?.id || (typeof companyData === 'object' ? String(companyData) : companyData));

                    return (
                      <Card
                        key={repCompany._id || repCompany.id}
                        className="bg-white/80 border border-white/50 rounded-xl shadow-sm hover:bg-white/70 transition-all"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <Building2 className="h-5 w-5 text-gray-600" />
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {companyData.name}
                                </h4>
                              </div>

                              {companyData.registrationNumber && (
                                <div className="text-sm text-gray-600 mb-3">
                                  Registration: {companyData.registrationNumber}
                                </div>
                              )}

                              {/* Roles (excluding Shareholder) */}
                              {rolesArray.length > 0 && (
                                <div className="flex flex-wrap gap-3 mb-3">
                                  {rolesArray.map((role: string, index: number) => (
                                    <Badge
                                      key={`${repCompany._id || repCompany.id}-role-${index}`}
                                      variant="outline"
                                      className={`rounded-xl px-2 py-1 text-xs font-semibold ${getRoleBadgeVariant(role)}`}
                                    >
                                      {role}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {companyData.address && (
                                <div className="text-sm text-gray-600">
                                  <span className="text-xs">{companyData.address}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 ml-4">
                              {/* View Button - Navigate to company details */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    // Ensure companyId_rep is a string
                                    const companyIdStr = typeof companyId_rep === 'string' 
                                      ? companyId_rep 
                                      : (typeof companyId_rep === 'object' 
                                          ? (companyId_rep?._id || companyId_rep?.id || String(companyId_rep))
                                          : String(companyId_rep));
                                    
                                    if (!companyIdStr) {
                                      toast({
                                        title: "Error",
                                        description: "Invalid company ID",
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    // Navigate to company details
                                    const metadata = getCompanyMetadata(companyIdStr);
                                    const resolvedClientId = metadata?.clientId || clientId;
                                    handleNavigateToCompany(companyIdStr, resolvedClientId);
                                  } catch (error: any) {
                                    console.error("Error navigating to company:", error);
                                    toast({
                                      title: "Error",
                                      description: error.message || "Failed to navigate to company",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="rounded-xl"
                                title="View Company"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {/* Edit Button - Open edit modal */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCompanyRep(repCompany);
                                }}
                                className="rounded-xl"
                                title="Edit Company"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {/* Delete Button - Show confirmation dialog */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCompanyRepClick(repCompany);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                title="Delete Company Representative"
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
              </div>
            )}
              </div>
            )}
           </TabsContent>



          {/* Shareholders Tab */}
          <TabsContent value="shareholders" className="space-y-4 mt-6">
            {/* Inline Form View */}
            {(activeInlineForm === "person-shareholder" || activeInlineForm === "company-shareholder") ? (
              <div className="h-[600px] overflow-y-auto border rounded-xl p-6 bg-white">
                {activeInlineForm === "person-shareholder" && (
                  <AddShareholderModal
                    isOpen={true}
                    inline={true}
                    onClose={() => setActiveInlineForm(null)}
                    onSuccess={() => {
                      setActiveInlineForm(null);
                      fetchPersons();
                      onUpdate();
                    }}
                    clientId={clientId}
                    companyId={companyId}
                    entityType="person"
                    companyTotalShares={company?.totalShares || 0}
                    existingSharesTotal={existingSharesTotals.personTotal + existingSharesTotals.companyTotal}
                  />
                )}
                {activeInlineForm === "company-shareholder" && (
                  <AddShareholderModal
                    isOpen={true}
                    inline={true}
                    onClose={() => setActiveInlineForm(null)}
                    onSuccess={() => {
                      setActiveInlineForm(null);
                      fetchPersons();
                      onUpdate();
                    }}
                    clientId={clientId}
                    companyId={companyId}
                    entityType="company"
                    companyTotalShares={company?.totalShares || 0}
                    existingSharesTotal={existingSharesTotals.personTotal + existingSharesTotals.companyTotal}
                  />
                )}
              </div>
            ) : (
              <div className="h-96 overflow-y-auto">
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
                    const totalShares = entry.totalShares;
                    const sharePercentage = entry.sharePercentage.toFixed(2);
                    const sharesData = entry.sharesData || [];
                    
                    return (
                      <Card
                        key={entry.id || `person-shareholder-${index}`}
                        className="bg-white/80 border border-white/50 rounded-xl shadow-sm hover:bg-white/70 transition-all"
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h4 className="text-lg font-semibold text-gray-900 capitalize">
                                  {entry.name}
                                </h4>
                              </div>
                              
                              {/* Share Classes Display */}
                              <div className="mb-3 space-y-2">
                                <div className="flex flex-col gap-4">
                                  <div className="space-x-2">
                                  {sharesData.map((sd: any, idx: number) => (
                                    <Badge
                                      key={`${entry.id}-class-${idx}`}
                                      variant="outline"
                                      className="bg-blue-50 text-blue-700 border-blue-200 rounded-lg px-3 py-1 text-sm font-medium"
                                    >
                                      {sd.class === "Ordinary"
                                        ? `Ordinary: ${sd.totalShares.toLocaleString()}`
                                        : `Class ${sd.class}: ${sd.totalShares.toLocaleString()}`}
                                    </Badge>
                                  ))}
                                  </div>

                                  <div className="space-x-2">
                                  <Badge
                                    variant="outline"
                                    className="bg-green-100 text-green-700 border-green-200 rounded-lg px-3 py-1 text-sm font-semibold"
                                  >
                                    Total: {totalShares.toLocaleString()}
                                  </Badge>

                                  <Badge
                                    variant="outline"
                                    className="bg-green-100 text-green-700 border-green-200 rounded-lg px-3 py-1 text-sm font-semibold"
                                  >
                                    Share Percentage: {sharePercentage}%
                                  </Badge>

                                  <Badge
                                    variant="outline"
                                    className="bg-purple-100 text-purple-700 border-purple-200 rounded-lg px-3 py-1 text-sm font-semibold"
                                  >
                                    Paid Up: {entry.paidUpSharesPercentage}%
                                  </Badge>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {entry.address && (
                                  <div className="flex items-start gap-2 text-sm text-gray-600">
                                    <MapPin className="h-4 w-4" />
                                    <span className="text-xs">{entry.address}</span>
                                  </div>
                                )}
                                {entry.nationality && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Globe className="h-4 w-4" />
                                    <span>{entry.nationality}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Find the person object from rawPersonShareholders
                                  const person = rawPersonShareholders.find(
                                    (p: any) => String(p._id || p.id) === entry.id
                                  );
                                  if (person) handleEditPerson(person);
                                }}
                                className="rounded-xl"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  // Find the person object from rawPersonShareholders
                                  const person = rawPersonShareholders.find(
                                    (p: any) => String(p._id || p.id) === entry.id
                                  );
                                  if (person) handleDeleteClick(person, false);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  // Company shareholder
                  const totalShares = entry.totalShares;
                  const sharePercentage = entry.sharePercentage.toFixed(2);
                  const sharesData = entry.sharesData || [];
                  
                  return (
                    <Card
                      key={entry.id || `company-shareholder-${index}`}
                      className="bg-white/80 border border-white/50 rounded-xl shadow-sm hover:bg-white/70 transition-all"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() =>
                              handleNavigateToCompany(entry.companyId)
                            }
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <Building2 className="h-5 w-5 text-gray-600" />
                              <h4 className="text-lg font-semibold text-gray-900 hover:text-brand-hover transition-colors">
                                {entry.companyName}
                              </h4>
                            </div>
                            
                            {/* Share Classes Display */}
                            <div className="mb-3 space-y-2">
                              <div className="flex flex-col gap-4">
                                <div className="space-x-2">
                                {sharesData.map((sd: any, idx: number) => (
                                  <Badge
                                    key={`${entry.id}-class-${idx}`}
                                    variant="outline"
                                    className="bg-blue-50 text-blue-700 border-blue-200 rounded-lg px-3 py-1 text-sm font-medium"
                                  >
                                    {sd.class === "Ordinary"
                                      ? `ordinary: ${sd.totalShares.toLocaleString()}`
                                      : `Class ${sd.class}: ${sd.totalShares.toLocaleString()}`}
                                  </Badge>
                                ))}
                                </div>
                                <div className="space-x-2">
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-700 border-green-200 rounded-lg px-3 py-1 text-sm font-semibold"
                                >
                                  Total: {totalShares.toLocaleString()}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-700 border-green-200 rounded-lg px-3 py-1 text-sm font-semibold"
                                >
                                  Share Percentage: {sharePercentage}%
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="bg-purple-100 text-purple-700 border-purple-200 rounded-lg px-3 py-1 text-sm font-semibold"
                                >
                                  Paid Up: {entry.paidUpSharesPercentage}%
                                </Badge>
                                </div>
                              </div>
                            </div>
                            
                            {entry.registrationNumber && (
                              <div className="text-sm text-gray-600">
                                Registration: {entry.registrationNumber}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            <Button variant="ghost" size="sm" onClick={() => handleNavigateToCompany(entry.companyId, entry.clientId)} className="rounded-xl">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditCompanyShare(entry);
                              }}
                              className="rounded-xl"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Find the company share object
                                const companyShare = shareholdingCompanies.find(
                                  (cs: any) => String(cs.companyId) === String(entry.companyId)
                                );
                                if (companyShare) handleDeleteCompanyShareClick(companyShare);
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
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
                    onClick={() => setActiveInlineForm("person-shareholder")}
                    className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Person
                  </Button>
                  <Button
                    onClick={() => setActiveInlineForm("company-shareholder")}
                    variant="outline"
                    className="rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                </div>
              </div>
            )}
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
        companyTotalShares={company?.totalShares || 0}
        existingSharesTotal={existingSharesTotals.personTotal + existingSharesTotals.companyTotal}
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
        company={company}
        existingShareTotal={shareTotals.personTotal + shareTotals.companyTotal}
        companyTotalShares={company?.totalShares || 0}
        existingSharesTotal={existingSharesTotals.personTotal + existingSharesTotals.companyTotal}
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
        isShareholdingCompany={true}
        parentCompanyId={companyId}
        parentCompany={company}
        existingShareTotal={shareTotals.personTotal + shareTotals.companyTotal}
      />

      {/* Edit Company Shareholder Dialog */}
      <Dialog 
        open={isEditCompanyShareOpen} 
        onOpenChange={(open) => {
          setIsEditCompanyShareOpen(open);
          if (!open) {
            // Reset form when closing
            setEditingShareValues({
              sharesA: "",
              sharesB: "",
              sharesC: "",
              sharesOrdinary: "",
            });
            setEditingShareError("");
            setEditingShareValidationError(null);
            setEditingCompanyShare(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Edit Shareholding Company Shares
            </DialogTitle>
            {editingCompanyShare?.companyId?.name && (
              <p className="text-sm text-gray-600 mt-1">
                Editing shares for <span className="font-semibold">{editingCompanyShare.companyId.name}</span>
              </p>
            )}
          </DialogHeader>

          <div className="py-4">
            <EditCompanyShares
              company={company}
              companyShare={editingCompanyShare}
              shareValues={editingShareValues}
              onShareChange={handleCompanyShareChange}
              error={editingShareError || editingShareValidationError || undefined}
              onValidationError={setEditingShareValidationError}
              paidUpSharesPercentage={editingPaidUpSharesPercentage}
              onPaidUpSharesChange={(val: number | "") => setEditingPaidUpSharesPercentage(val === "" ? 0 : val)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditCompanyShareOpen(false);
                setEditingShareValidationError(null);
              }}
              disabled={isSubmittingShare}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateCompanyShare}
              disabled={isSubmittingShare || !!editingShareValidationError}
              className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
            >
              {isSubmittingShare ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Shares"
              )}
            </Button>
          </DialogFooter>
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
          clientId: share.clientId,
        }))}
        existingRepresentativeIds={existingRepresentativeIds}
      />

      {/* Add Person Shareholder Modal */}
      <AddShareholderModal
        isOpen={isAddPersonShareholderModalOpen}
        onClose={() => setIsAddPersonShareholderModalOpen(false)}
        onSuccess={() => {
          fetchPersons();
          onUpdate();
        }}
        clientId={clientId}
        companyId={companyId}
        entityType="person"
        companyTotalShares={company?.totalShares || 0}
        existingSharesTotal={existingSharesTotals.personTotal + existingSharesTotals.companyTotal}
        company={company}
      />

      {/* Add Company Shareholder Modal */}
      <AddShareholderModal
        isOpen={isAddCompanyShareholderModalOpen}
        onClose={() => setIsAddCompanyShareholderModalOpen(false)}
        onSuccess={() => {
          fetchPersons();
          onUpdate();
        }}
        clientId={clientId}
        companyId={companyId}
        entityType="company"
        companyTotalShares={company?.totalShares || 0}
        existingSharesTotal={existingSharesTotals.personTotal + existingSharesTotals.companyTotal}
        company={company}
      />

      {/* Add Person Representative Modal */}
      <AddShareholderRepresentativeModal
        isOpen={isAddPersonRepresentativeModalOpen}
        onClose={() => setIsAddPersonRepresentativeModalOpen(false)}
        onSuccess={() => {
          fetchPersons();
          onUpdate();
        }}
        clientId={clientId}
        companyId={companyId}
        mode="representative"
        companyTotalShares={company?.totalShares || 0}
        existingSharesTotal={existingSharesTotals.personTotal + existingSharesTotals.companyTotal}
        company={company}
      />

      {/* Add Company Representative Modal */}
      <AddShareholderRepresentativeModal
        isOpen={isAddCompanyRepresentativeModalOpen}
        onClose={() => setIsAddCompanyRepresentativeModalOpen(false)}
        onSuccess={() => {
          fetchPersons();
          onUpdate();
        }}
        clientId={clientId}
        companyId={companyId}
        mode="representative"
        companyTotalShares={company?.totalShares || 0}
        existingSharesTotal={existingSharesTotals.personTotal + existingSharesTotals.companyTotal}
        company={company}
      />

      {/* Edit Company Representative Roles Dialog */}
      <Dialog 
        open={isEditCompanyRepRolesOpen} 
        onOpenChange={(open) => {
          if (!open && !isSavingRoles) {
            setIsEditCompanyRepRolesOpen(false);
            setEditingCompanyRep(null);
            setEditingRoles([]);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Edit Company Representative Roles
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              {editingCompanyRep?.companyId?.name && (
                <span>Update roles for <span className="font-semibold">{editingCompanyRep.companyId.name}</span></span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Select Roles</Label>
              <div className="space-y-2">
                {COMPANY_REP_ROLES.map((role) => {
                  const isChecked = editingRoles.includes(role);
                  return (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditingRoles([...editingRoles, role]);
                          } else {
                            setEditingRoles(editingRoles.filter((r) => r !== role));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`role-${role}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {role}
                      </Label>
                    </div>
                  );
                })}
              </div>
              {editingRoles.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  Please select at least one role
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditCompanyRepRolesOpen(false);
                setEditingCompanyRep(null);
                setEditingRoles([]);
              }}
              disabled={isSavingRoles}
              className="rounded-xl flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCompanyRepRoles}
              disabled={isSavingRoles || editingRoles.length === 0}
              className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl flex-1"
            >
              {isSavingRoles ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Roles"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Company Representative Confirmation Dialog */}
      <Dialog 
        open={isDeleteCompanyRepDialogOpen} 
        onOpenChange={(open) => {
          if (!open && !isDeletingCompanyRep) {
            setIsDeleteCompanyRepDialogOpen(false);
            setCompanyRepToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Remove Company Representative
              </DialogTitle>
            </div>
          </DialogHeader>

          <DialogDescription className="text-gray-600 py-4">
            Are you sure you want to remove <span className="font-semibold text-gray-900">
              {companyRepToDelete?.companyId?.name || companyRepToDelete?.companyName || "this company"}
            </span> as a company representative?
            This action cannot be undone and will permanently remove this representative relationship.
          </DialogDescription>

          <DialogFooter className="flex gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteCompanyRepDialogOpen(false);
                setCompanyRepToDelete(null);
              }}
              disabled={isDeletingCompanyRep}
              className="rounded-xl flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCompanyRepConfirm}
              disabled={isDeletingCompanyRep}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl flex-1"
            >
              {isDeletingCompanyRep ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
