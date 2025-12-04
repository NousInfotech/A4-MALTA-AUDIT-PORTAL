import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Building2, Plus, X, ChevronDown, ChevronUp, Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  updateRepresentationPersonExisting,
  addRepresentationPersonNew,
  updateRepresentationPersonExistingBulk,
  addRepresentationPersonNewBulk,
  updateRepresentationCompanyExisting,
  addRepresentationCompanyNew,
  updateRepresentationCompanyExistingBulk,
  addRepresentationCompanyNewBulk,
  searchCompaniesGlobal,
  searchPersonsGlobal,
  ShareDataItem,
  addShareHolderCompanyNew,
  updateShareHolderCompanyExisting,
} from "@/lib/api/company";
import { fetchCompanies } from "@/lib/api/company";
import { fetchCompanyById } from "@/lib/api/company";

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
  ordinary: 0,
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

interface AddRepresentativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  companyId: string;
  company: any;
  entityType: "person" | "company";
  inline?: boolean; // When true, renders without Dialog wrapper
}

interface ExistingEntity {
  id: string;
  name: string;
  type: "person" | "company";
  roles: string[];
  sharesData: ShareDataItem[];
  classAShares?: number;
  classBShares?: number;
  classCShares?: number;
  expanded?: boolean;
}

interface NewEntityForm {
  // Person fields
  name: string;
  nationality: string;
  address: string;
  email?: string;
  phoneNumber?: string;
  // Company fields
  registrationNumber?: string;
  industry?: string;
  customIndustry?: string;
  description?: string;
  companyStartedAt?: string;
  // Company's own totalShares (for new companies only) - uses share class logic
  shareClassValues?: ShareClassValues;
  useClassShares?: boolean;
  visibleShareClasses?: string[];
  // Shareholder shares (for the shares this entity holds in the parent company)
  classAShares: number;
  classBShares: number;
  classCShares: number;
  sharesData: ShareDataItem[];
  roles: string[];
}


const REPRESENTATIVE_ROLES = [
  "Director",
  "Judicial Representative",
  "Legal Representative",
  "Secretary",
];

export const AddRepresentativeModal: React.FC<AddRepresentativeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  companyId,
  company,
  entityType,
  inline = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [existingEntities, setExistingEntities] = useState<any[]>([]);
  const [selectedExistingEntities, setSelectedExistingEntities] = useState<ExistingEntity[]>([]);
  const [newEntities, setNewEntities] = useState<NewEntityForm[]>([
    {
      name: "",
      nationality: "",
      address: "",
      roles: [],
      classAShares: 0,
      classBShares: 0,
      classCShares: 0,
      sharesData: [],
      // Initialize share class values for companies
      ...(entityType === "company" && {
        shareClassValues: getDefaultShareClassValues(),
        useClassShares: false,
        visibleShareClasses: [],
        industry: "",
        customIndustry: "",
      }),
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nationalityOptions, setNationalityOptions] = useState<
    { value: string; label: string; isEuropean: boolean }[]
  >([]);
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  
  // View mode: "existing" or "new"
  const [viewMode, setViewMode] = useState<"existing" | "new">("existing");
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [shareValidationErrors, setShareValidationErrors] = useState<Record<string, string>>({});
  // Global search state
  const [isGlobalSearchMode, setIsGlobalSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchPagination, setSearchPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  const { toast } = useToast();

  // Set global search mode based on entity type
  useEffect(() => {
    if (entityType === "person") {
      // Always disable global search for persons
      setIsGlobalSearchMode(false);
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
      setSearchPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    } else if (entityType === "company") {
      // Always enable global search for companies
      setIsGlobalSearchMode(true);
    }
  }, [entityType]);

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

    if (entityType === "person") {
      fetchNationalities();
    }
  }, [entityType]);

  // Fetch existing entities
  useEffect(() => {
    if (isOpen) {
      fetchExistingEntities();
    }
  }, [isOpen, entityType, clientId, companyId]);

  // Fetch current company data
  useEffect(() => {
    if (isOpen && companyId) {
      const fetchCompany = async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) return;

          const companyResponse = await fetch(
            `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
            {
              headers: {
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            }
          );

          if (companyResponse.ok) {
            const companyResult = await companyResponse.json();
            setCurrentCompany(companyResult.data || {});
          }
        } catch (error) {
          console.error("Error fetching company:", error);
        }
      };
      fetchCompany();
    }
  }, [isOpen, companyId, clientId]);

  // Validate shares when entities or currentCompany changes
  useEffect(() => {
    if (isOpen && currentCompany) {
      validateShares();
    }
  }, [isOpen, currentCompany, selectedExistingEntities, newEntities]);
  const fetchExistingEntities = async () => {
    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      // First, fetch the company to get existing representatives
      const company = await fetchCompanyById(clientId, companyId);
      if (!company) throw new Error("Failed to fetch company");

      // Use company.data if available, otherwise fallback to company
      const companyData = company.data || company;

      // Get IDs of existing representatives and their roles
      let existingRepresentativeIds = new Set<string>();
      // Map of person ID to their roles (for persons with multiple roles)
      const personRolesMap = new Map<string, string[]>();
      
      if (entityType === "person") {
        // Get person IDs and roles from representationalSchema
        const representationalSchema = companyData.representationalSchema || [];
        representationalSchema.forEach((rep: any) => {
          const personId = rep?.personId?._id || rep?.personId?.id || rep?.personId;
          if (personId) {
            const personIdStr = String(personId);
            // Get roles array - handle both array and single value
            const roles = Array.isArray(rep.role) ? rep.role : (rep.role ? [rep.role] : []);
            personRolesMap.set(personIdStr, roles);
            
            // Show persons with ONLY "Shareholder" role (they can be made representatives)
            // Exclude persons with multiple roles (Shareholder + other representative roles)
            const hasOnlyShareholderRole = roles.length === 1 && roles[0] === "Shareholder";
            if (hasOnlyShareholderRole) {
              // Person has only "Shareholder" role - show them (don't add to existingRepresentativeIds)
              // They can be selected to add other representative roles
            } else if (roles.length > 0) {
              // Person has multiple roles (including other representative roles) - exclude them
              existingRepresentativeIds.add(personIdStr);
            }
          }
        });
      } else {
        // Get company IDs from representationalCompany
        const representationalCompany = companyData.representationalCompany || [];
        representationalCompany.forEach((rep: any) => {
          const repCompanyId = rep?.companyId?._id || rep?.companyId?.id || rep?.companyId;
          if (repCompanyId) {
            existingRepresentativeIds.add(String(repCompanyId));
          }
        });
      }

      if (entityType === "person") {
        // Fetch direct persons from the current company
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
        const directPersons = result.data || [];
        
        console.log(company);
        
        
        // Add source company info to direct persons (parent company)
        const directPersonsWithSource = directPersons.map((person: any) => ({
          ...person,
          sourceCompany: {
            id: companyId,
            name: companyData.name || "Parent Company",
          },
        }));
        
        // Also fetch persons from shareholding companies (Level 1)
        const shareHoldingCompanies = companyData.shareHoldingCompanies || [];
        const allPersonsFromShareholdingCompanies: any[] = [];
        
        // Process Level 1 shareholding companies
        for (const shareholdingCompany of shareHoldingCompanies) {
          const shareholdingCompanyId = shareholdingCompany?.companyId?._id || 
                                       shareholdingCompany?.companyId?.id || 
                                       shareholdingCompany?.companyId;
          const shareholdingCompanyName = shareholdingCompany?.companyId?.name || 
                                         shareholdingCompany?.name || 
                                         "Unknown Company";
          
          if (!shareholdingCompanyId) continue;
          
          // 1. Fetch persons from Level 1 company
          try {
            const shareholdingResponse = await fetch(
              `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${shareholdingCompanyId}/person`,
              {
                headers: {
                  Authorization: `Bearer ${sessionData.session.access_token}`,
                },
              }
            );
            
            if (shareholdingResponse.ok) {
              const shareholdingResult = await shareholdingResponse.json();
              const shareholdingPersons = shareholdingResult.data || [];
              const shareholdingPersonsWithSource = shareholdingPersons.map((person: any) => ({
                ...person,
                sourceCompany: {
                  id: shareholdingCompanyId,
                  name: shareholdingCompanyName,
                },
              }));
              allPersonsFromShareholdingCompanies.push(...shareholdingPersonsWithSource);
            }
          } catch (error) {
            console.error(`Error fetching persons from shareholding company ${shareholdingCompanyId}:`, error);
          }
        }
        
        // Get shareholders separately
        const shareHolders = (companyData.shareHolders || []).map((shareholder: any) => 
          shareholder.personId
        );
        
        // Enrich shareholders with sourceCompany info if they don't have it
        const enrichedShareHolders = shareHolders.map((person: any) => ({
          ...person,
          sourceCompany: person.sourceCompany || {
            name: companyData.name || "Parent Company",
            id: companyId
          }
        }));
        
        // Combine all persons (direct, from shareholding companies, and shareholders) using a Map to avoid duplicates
        const personsMap = new Map<string, any>();
        
        // Helper function to get person ID consistently
        const getPersonId = (person: any): string | null => {
          const id = person._id || person.id;
          return id ? String(id) : null;
        };
        
        // First, deduplicate persons from shareholding companies (they might appear in multiple companies)
        // Also filter out null/undefined persons
        const shareholdingPersonsMap = new Map<string, any>();
        allPersonsFromShareholdingCompanies
          .filter((person: any) => person && (person._id || person.id)) // Filter out null/undefined
          .forEach((person: any) => {
            const personId = getPersonId(person);
            if (personId && !shareholdingPersonsMap.has(personId)) {
              shareholdingPersonsMap.set(personId, person);
            }
          });
        const deduplicatedShareholdingPersons = Array.from(shareholdingPersonsMap.values());
        
        // Add direct persons first (filter out null/undefined)
        directPersonsWithSource
          .filter((person: any) => person && (person._id || person.id))
          .forEach((person: any) => {
            const personId = getPersonId(person);
            if (personId) {
              personsMap.set(personId, person);
            }
          });
        
        // Add persons from shareholding companies (only if not already in map)
        deduplicatedShareholdingPersons.forEach((person: any) => {
          const personId = getPersonId(person);
          if (personId && !personsMap.has(personId)) {
            personsMap.set(personId, person);
          }
        });
        
        // Add shareholders (only if not already in map - they might already be in directPersons)
        // Filter out null/undefined shareholders
        enrichedShareHolders
          .filter((person: any) => person && (person._id || person.id))
          .forEach((person: any) => {
            const personId = getPersonId(person);
            if (personId && !personsMap.has(personId)) {
              personsMap.set(personId, person);
            }
          });
        
        // Filter out existing representatives
        const filteredPersons = Array.from(personsMap.values()).filter((person: any) => {
          const personId = getPersonId(person);
          return personId && !existingRepresentativeIds.has(personId);
        });
        
        setExistingEntities(filteredPersons);
      } else {
        // Companies mode
        const shareHoldingCompanies = companyData.shareHoldingCompanies || [];
        const representationalCompany = companyData.representationalCompany || [];
        
        // Create a map of company ID to their roles in representationalCompany
        const companyRolesMap = new Map<string, string[]>();
        representationalCompany.forEach((rep: any) => {
          const repCompanyId = rep?.companyId?._id || rep?.companyId?.id || rep?.companyId;
          if (repCompanyId) {
            const companyIdStr = String(repCompanyId);
            // Get roles array - handle both array and single value
            const roles = Array.isArray(rep.role) ? rep.role : (rep.role ? [rep.role] : []);
            companyRolesMap.set(companyIdStr, roles);
          }
        });
        
        // Filter companies:
        // - Show if they have ONLY "Shareholder" role in representationalCompany
        // - Show if they are not in representationalCompany at all (just shareholders)
        // - Don't show if they have multiple roles (Shareholder + other representative roles)
        const filteredCompanies = shareHoldingCompanies.filter((item: any) => {
          const comp = item.companyId;
          const cId = String(comp._id || comp.id);
          
          // Check if company exists in representationalCompany
          const roles = companyRolesMap.get(cId);
          
          // If not in representationalCompany, show it (it's just a shareholder, no representative roles)
          if (!roles || roles.length === 0) {
            return true;
          }
          
          // If in representationalCompany, check if it has ONLY "Shareholder" role
          // Must have exactly 1 role and that role must be "Shareholder"
          const hasOnlyShareholderRole = roles.length === 1 && roles[0] === "Shareholder";
          
          // Show only if it has ONLY "Shareholder" role (no other representative roles)
          return hasOnlyShareholderRole;
        });
        
        const availableCompanies = filteredCompanies.map((item: any) => {
          return item.companyId;
        });
    
        setExistingEntities(availableCompanies);
      }
    } catch (error) {
      console.error("Error fetching entities:", error);
      toast({
        title: "Error",
        description: `Failed to load ${entityType === "person" ? "persons" : "companies"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExistingEntityToggle = (entity: any) => {
    const entityId = entity._id || entity.id;
    const existingIndex = selectedExistingEntities.findIndex((e) => e.id === entityId);

    if (existingIndex >= 0) {
      // Remove if already selected
      setSelectedExistingEntities(selectedExistingEntities.filter((_, i) => i !== existingIndex));
      setExpandedEntities((prev) => {
        const next = new Set(prev);
        next.delete(entityId);
        return next;
      });
    } else {
      // Add new selection
      setSelectedExistingEntities([
        ...selectedExistingEntities,
        {
          id: entityId,
          name: entity.name,
          type: entityType,
          roles: [],
          sharesData: [{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }],
          classAShares: 0,
          classBShares: 0,
          classCShares: 0,
          expanded: true,
        },
      ]);
      setExpandedEntities((prev) => new Set(prev).add(entityId));
    }
  };

  const handleExistingEntityRoleToggle = (entityId: string, role: string) => {
    setSelectedExistingEntities(
      selectedExistingEntities.map((entity) => {
        if (entity.id === entityId) {
          const newRoles = entity.roles.includes(role)
            ? entity.roles.filter((r) => r !== role)
            : [...entity.roles, role];
          return { ...entity, roles: newRoles };
        }
        return entity;
      })
    );
  };

  const toggleExistingEntityExpanded = (entityId: string) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  };

  // Helper function to convert class fields to sharesData array (for shareholder shares)
  const classFieldsToSharesData = (classA: number, classB: number, classC: number): ShareDataItem[] => {
    const sharesData: ShareDataItem[] = [];
    if (classA > 0) sharesData.push({ totalShares: classA, shareClass: "A", shareType: "Ordinary" });
    if (classB > 0) sharesData.push({ totalShares: classB, shareClass: "B", shareType: "Ordinary" });
    if (classC > 0) sharesData.push({ totalShares: classC, shareClass: "C", shareType: "Ordinary" });
    return sharesData;
  };

  // Helper function to convert sharesData array to class fields (for shareholder shares)
  const sharesDataToClassFields = (sharesData: ShareDataItem[]) => {
    let classA = 0, classB = 0, classC = 0;
    sharesData.forEach(sd => {
      if (sd.shareClass === "A") classA += Number(sd.totalShares) || 0;
      if (sd.shareClass === "B") classB += Number(sd.totalShares) || 0;
      if (sd.shareClass === "C") classC += Number(sd.totalShares) || 0;
    });
    return { classA, classB, classC };
  };

  const handleAddNewEntity = () => {
    setNewEntities([
      ...newEntities,
      {
        name: "",
        nationality: "",
        address: "",
        roles: [],
        classAShares: 0,
        classBShares: 0,
        classCShares: 0,
        sharesData: [{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }],
        // Initialize share class values for companies
        ...(entityType === "company" && {
          shareClassValues: getDefaultShareClassValues(),
          useClassShares: false,
          visibleShareClasses: [],
          industry: "",
          customIndustry: "",
        }),
      },
    ]);
  };

  const handleRemoveNewEntity = (index: number) => {
    setNewEntities(newEntities.filter((_, i) => i !== index));
  };

  const handleNewEntityChange = (
    index: number,
    field: keyof NewEntityForm,
    value: any
  ) => {
    setNewEntities((prev) =>
      prev.map((entity, i) =>
        i === index ? { ...entity, [field]: value } : entity
      )
    );
  };

  const handleNewEntityRoleToggle = (index: number, role: string) => {
    setNewEntities(
      newEntities.map((entity, i) => {
        if (i === index) {
          const newRoles = entity.roles.includes(role)
            ? entity.roles.filter((r) => r !== role)
            : [...entity.roles, role];
          return { ...entity, roles: newRoles };
        }
        return entity;
      })
    );
  };

  const handleExistingEntityClassSharesChange = (
    entityId: string,
    shareClass: "A" | "B" | "C",
    value: number
  ) => {
    setSelectedExistingEntities(
      selectedExistingEntities.map((entity) => {
        if (entity.id === entityId) {
          const updated = { ...entity };
          if (shareClass === "A") updated.classAShares = value;
          if (shareClass === "B") updated.classBShares = value;
          if (shareClass === "C") updated.classCShares = value;
          
          // Sync with sharesData
          updated.sharesData = classFieldsToSharesData(
            updated.classAShares || 0,
            updated.classBShares || 0,
            updated.classCShares || 0
          );
          
          return updated;
        }
        return entity;
      })
    );
    
    // Validate after change
    setTimeout(() => validateShares(), 0);
  };

  const handleNewEntityClassSharesChange = (
    entityIndex: number,
    shareClass: "A" | "B" | "C",
    value: number
  ) => {
    setNewEntities(
      newEntities.map((entity, i) => {
        if (i === entityIndex) {
          const updated = { ...entity };
          if (shareClass === "A") updated.classAShares = value;
          if (shareClass === "B") updated.classBShares = value;
          if (shareClass === "C") updated.classCShares = value;
          
          // Sync with sharesData
          updated.sharesData = classFieldsToSharesData(
            updated.classAShares || 0,
            updated.classBShares || 0,
            updated.classCShares || 0
          );
          
          return updated;
        }
        return entity;
      })
    );
    
    // Validate after change
    setTimeout(() => validateShares(), 0);
  };

  const handleShareValueChange = (
    index: number,
    key: ShareClassKey,
    label: string,
    rawValue: string
  ) => {
    setNewEntities(
      newEntities.map((entity, i) => {
        if (i !== index || !entity.shareClassValues) return entity;

        if (rawValue === "") {
          return {
            ...entity,
            shareClassValues: { ...entity.shareClassValues, [key]: 0 },
          };
        }

        const parsedValue = parseInt(rawValue, 10);
        if (Number.isNaN(parsedValue) || parsedValue < 0) {
          return entity;
        }

        // Reset the inactive mode when entering a value
        const updatedValues = { ...entity.shareClassValues };
        if (key === "ordinary") {
          // If entering Ordinary, reset A, B, C
          updatedValues.classA = 0;
          updatedValues.classB = 0;
          updatedValues.classC = 0;
          updatedValues.ordinary = parsedValue;
        } else {
          // If entering A, B, or C, reset Ordinary
          updatedValues.ordinary = 0;
          updatedValues[key] = parsedValue;
        }

        return {
          ...entity,
          shareClassValues: updatedValues,
        };
      })
    );
  };

  const handleShareClassToggle = (index: number, checked: boolean) => {
    setNewEntities(
      newEntities.map((entity, i) => {
        if (i !== index || !entity.shareClassValues) return entity;

        if (!checked) {
          // Switch to Ordinary mode: reset A, B, C to 0, keep Ordinary
          return {
            ...entity,
            useClassShares: false,
            visibleShareClasses: [],
            shareClassValues: {
              ...entity.shareClassValues,
              classA: 0,
              classB: 0,
              classC: 0,
              ordinary: entity.shareClassValues.ordinary || 100,
            },
          };
        } else {
          // Switch to Share Classes mode: reset Ordinary to 0, enable A, B, C
          return {
            ...entity,
            useClassShares: true,
            visibleShareClasses: OPTIONAL_SHARE_CLASS_LABELS,
            shareClassValues: {
              ...entity.shareClassValues,
              ordinary: 0,
            },
          };
        }
      })
    );
  };

  const validateForm = (): string | null => {
    // Validate shares don't exceed remaining
    if (!validateShares()) {
      return shareValidationErrors.global || "Total shares exceed available shares";
    }
    
    // Validate existing entities have at least one role
    for (const entity of selectedExistingEntities) {
      if (entity.roles.length === 0) {
        return `Please select at least one role for ${entity.name}`;
      }
    }

    // Filter out empty new entity forms (only validate entities that have at least some data)
    const filledNewEntities = newEntities.filter((entity) => {
      // Check if entity has any data entered
      const hasName = entity.name.trim().length > 0;
      const hasAddress = entity.address.trim().length > 0;
      const hasNationality = entityType === "person" ? entity.nationality.length > 0 : false;
      const hasRegistrationNumber = entityType === "company" ? (entity.registrationNumber?.trim().length || 0) > 0 : false;
      const hasRoles = entity.roles.length > 0;
      
      // Entity is considered "filled" if it has any of the required fields
      return hasName || hasAddress || hasNationality || hasRegistrationNumber || hasRoles;
    });

    // Validate only filled new entities
    for (let i = 0; i < filledNewEntities.length; i++) {
      const entity = filledNewEntities[i];
      if (!entity.name.trim()) {
        return `Please enter name for new ${entityType} #${i + 1}`;
      }
      if (entityType === "person") {
        if (!entity.nationality) {
          return `Please select nationality for ${entity.name || `new person #${i + 1}`}`;
        }
      } else {
        if (!entity.registrationNumber?.trim()) {
          return `Please enter registration number for ${entity.name || `new company #${i + 1}`}`;
        }
        // Validate total shares for companies
        if (entity.shareClassValues) {
          const totalSum = calculateTotalSharesSum(
            entity.shareClassValues,
            entity.useClassShares || false
          );
        
        }
      }
      if (!entity.address.trim()) {
        return `Please enter address for ${entity.name || `new ${entityType} #${i + 1}`}`;
      }
      if (entity.roles.length === 0) {
        return `Please select at least one role for ${entity.name || `new ${entityType} #${i + 1}`}`;
      }
    }

    // Check if at least one entity is selected or created
    if (selectedExistingEntities.length === 0 && filledNewEntities.length === 0) {
      return "Please select at least one existing entity or create a new one";
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      // Process existing entities
      if (selectedExistingEntities.length > 0) {
        if (entityType === "person") {
          if (selectedExistingEntities.length === 1) {
            // Single update
            await updateRepresentationPersonExisting(
              clientId,
              companyId,
              selectedExistingEntities[0].id,
              { 
                role: selectedExistingEntities[0].roles,
                companyId: (selectedExistingEntities[0] as any).sourceCompany?.id !== companyId 
                  ? (selectedExistingEntities[0] as any).sourceCompany?.id 
                  : undefined
              }
            );
          } else {
            // Bulk update - need to process individually since API might not support per-entity roles in bulk
            for (const entity of selectedExistingEntities) {
              await updateRepresentationPersonExisting(clientId, companyId, entity.id, {
                role: entity.roles,
                companyId: (entity as any).sourceCompany?.id !== companyId 
                  ? (entity as any).sourceCompany?.id 
                  : undefined
              });
            }
          }
        } else {
          // Get current company to check if entities are already shareholders
          const companyResponse = await fetch(
            `${import.meta.env.VITE_APIURL}/api/client/non-primary/company/${companyId}`,
            {
              headers: {
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            }
          );

          let currentCompany = null;
          if (companyResponse.ok) {
            const companyResult = await companyResponse.json();
            currentCompany = companyResult.data || {};
          }

          const existingShareholderIds = new Set(
            (currentCompany?.shareHoldingCompanies || []).map((sh: any) => {
              const compId = sh?.companyId?._id || sh?.companyId?.id || sh?.companyId;
              return String(compId);
            })
          );

          if (selectedExistingEntities.length === 1) {
            // Single update
            const entity = selectedExistingEntities[0];
            await updateRepresentationCompanyExisting(
              clientId,
              companyId,
              entity.id,
              { role: entity.roles }
            );

            // If shares are provided, also add/update as shareholder
            const validSharesData = entity.sharesData?.filter((sd) => Number(sd.totalShares) > 0) || [];
            if (validSharesData.length > 0) {
              if (existingShareholderIds.has(String(entity.id))) {
                // Update existing shareholder
                await updateShareHolderCompanyExisting("non-primary", companyId, entity.id, {
                  sharesData: validSharesData,
                });
              } else {
                // Add new shareholder
                await addShareHolderCompanyNew("non-primary", companyId, {
                  companyId: entity.id,
                  sharesData: validSharesData,
                });
              }
            }
          } else {
            // Bulk update - need to process individually
            for (const entity of selectedExistingEntities) {
              await updateRepresentationCompanyExisting(clientId, companyId, entity.id, {
                role: entity.roles,
              });

              // If shares are provided, also add/update as shareholder
              const validSharesData = entity.sharesData?.filter((sd) => Number(sd.totalShares) > 0) || [];
              if (validSharesData.length > 0) {
                if (existingShareholderIds.has(String(entity.id))) {
                  // Update existing shareholder
                  await updateShareHolderCompanyExisting("non-primary", companyId, entity.id, {
                    sharesData: validSharesData,
                  });
                } else {
                  // Add new shareholder
                  await addShareHolderCompanyNew("non-primary", companyId, {
                    companyId: entity.id,
                    sharesData: validSharesData,
                  });
                }
              }
            }
          }
        }
      }

      // Process new entities (only those that have data)
      const filledNewEntities = newEntities.filter((entity) => {
        const hasName = entity.name.trim().length > 0;
        const hasAddress = entity.address.trim().length > 0;
        const hasNationality = entityType === "person" ? entity.nationality.length > 0 : false;
        const hasRegistrationNumber = entityType === "company" ? (entity.registrationNumber?.trim().length || 0) > 0 : false;
        const hasRoles = entity.roles.length > 0;
        return hasName || hasAddress || hasNationality || hasRegistrationNumber || hasRoles;
      });

      if (filledNewEntities.length > 0) {
        for (const entity of filledNewEntities) {
          if (entityType === "person") {
            // First create the person
            const personResponse = await fetch(
              `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({
                  name: entity.name,
                  nationality: entity.nationality,
                  address: entity.address,
                  email: entity.email || undefined,
                  phoneNumber: entity.phoneNumber || undefined,
                }),
              }
            );

            if (!personResponse.ok) {
              const error = await personResponse.json();
              throw new Error(error.message || "Failed to create person");
            }

            const personResult = await personResponse.json();
            const personId = personResult.data?._id || personResult.data?.id;

            // Then add representation
            await addRepresentationPersonNew(clientId, companyId, {
              personId,
              role: entity.roles,
              // For new persons, they are created directly under this company, so no external companyId needed
            });
          } else {
            // First create the company
            // Build totalShares payload with only the selected mode's data
            const totalSharesPayload = entity.shareClassValues && entity.useClassShares !== undefined
              ? buildTotalSharesPayload(entity.shareClassValues, entity.useClassShares)
              : undefined;

            const companyResponse = await fetch(
              `${import.meta.env.VITE_APIURL}/api/client/non-primary/company`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({
                  name: entity.name,
                  registrationNumber: entity.registrationNumber,
                  address: entity.address,
                  totalShares: totalSharesPayload,
                  industry: (entity.industry === "Other" ? entity.customIndustry : entity.industry)?.trim() || undefined,
                  description: entity.description || undefined,
                  companyStartedAt: entity.companyStartedAt || undefined,
                }),
              }
            );

            if (!companyResponse.ok) {
              const error = await companyResponse.json();
              throw new Error(error.message || "Failed to create company");
            }

            const companyResult = await companyResponse.json();
            const companyId_new = companyResult.data?._id || companyResult.data?.id;

            // Then add representation
            await addRepresentationCompanyNew("non-primary", companyId, {
              companyId: companyId_new,
              role: entity.roles,
            });

            // If shares are provided, also add as shareholder
            const validSharesData = entity.sharesData?.filter((sd) => Number(sd.totalShares) > 0) || [];
            if (validSharesData.length > 0) {
              await addShareHolderCompanyNew("non-primary", companyId, {
                companyId: companyId_new,
                sharesData: validSharesData,
              });
            }
          }
        }
      }

      toast({
        title: "Success",
        description: "Representatives added successfully",
      });

      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add representatives",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Global search function
  const handleGlobalSearch = async (pageOverride?: number) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      const currentPage = pageOverride !== undefined ? pageOverride : searchPagination.page;
      
      if (entityType === "person") {
        const result = await searchPersonsGlobal({
          search: searchQuery.trim(),
          page: currentPage,
          limit: searchPagination.limit,
        });
        setSearchResults(result.data || []);
        setSearchPagination(result.pagination || searchPagination);
      } else {
        const result = await searchCompaniesGlobal({
          search: searchQuery.trim(),
          page: currentPage,
          limit: searchPagination.limit,
        });
        setSearchResults(result.data || []);
        setSearchPagination(result.pagination || searchPagination);
      }
    } catch (error: any) {
      console.error("Error searching globally:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to search",
        variant: "destructive",
      });
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExitGlobalSearch = () => {
    setIsGlobalSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setSearchPagination({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  };

  const handleClose = () => {
    setSelectedExistingEntities([]);
    setNewEntities([
      {
        name: "",
        nationality: "",
        address: "",
        roles: [],
        classAShares: 0,
        classBShares: 0,
        classCShares: 0,
        sharesData: [{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }],
        ...(entityType === "company" && {
          shareClassValues: getDefaultShareClassValues(),
          useClassShares: false,
          visibleShareClasses: [],
          industry: "",
          customIndustry: "",
        }),
      },
    ]);
    setExpandedEntities(new Set());
    setShareValidationErrors({});
    setCurrentCompany(null);
    setIsGlobalSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setSearchPagination({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
    onClose();
  };

  if (!isOpen) return null;

  
  // Get IDs of companies that are already representatives (excluding those with only "Shareholder" role)
  const existingRepresentativeCompanyIds = useMemo(() => {
    const ids = new Set<string>();
    
    if (!currentCompany?.representationalCompany || !Array.isArray(currentCompany.representationalCompany)) {
      return ids;
    }
    
    currentCompany.representationalCompany.forEach((rep: any) => {
      const repCompanyId = rep?.companyId?._id || rep?.companyId?.id || rep?.companyId;
      if (repCompanyId) {
        const companyIdStr = String(repCompanyId);
        // Get roles array - handle both array and single value
        const roles = Array.isArray(rep.role) ? rep.role : (rep.role ? [rep.role] : []);
        
        // Only exclude if company has representative roles (not just "Shareholder")
        // If it has only "Shareholder" role, it can still be selected
        const hasOnlyShareholderRole = roles.length === 1 && roles[0] === "Shareholder";
        if (!hasOnlyShareholderRole && roles.length > 0) {
          ids.add(companyIdStr);
        }
      }
    });
    
    return ids;
  }, [currentCompany]);

  // Filter search results to exclude companies that are already representatives and the current company
  const filteredSearchResults = useMemo(() => {
    if (entityType !== "company") return searchResults;
    
    const currentCompanyIdStr = companyId ? String(companyId) : null;
    
    return searchResults.filter((entity) => {
      const entityId = entity._id || entity.id;
      const entityIdStr = String(entityId);
      // Filter out the current company
      if (currentCompanyIdStr && entityIdStr === currentCompanyIdStr) {
        return false;
      }
      // Filter out companies that are already representatives
      return !existingRepresentativeCompanyIds.has(entityIdStr);
    });
  }, [searchResults, existingRepresentativeCompanyIds, entityType, companyId]);

  // Get available share classes from parent company
  const getAvailableShareClasses = useCallback((): Array<"A" | "B" | "C" | "Ordinary"> => {
    if (!currentCompany?.totalShares || !Array.isArray(currentCompany.totalShares)) {
      return ["A", "B", "C"]; // Default fallback
    }
    
    const classes = currentCompany.totalShares
      .filter((share: any) => Number(share.totalShares) > 0)
      .map((share: any) => share.class)
      .filter((cls: string) => cls && cls !== "") as Array<"A" | "B" | "C" | "Ordinary">;
    
    // If no classes found, return default
    return classes.length > 0 ? classes : ["A", "B", "C"];
  }, [currentCompany]);


    // Calculate allocated shares per class from existing shareholders
    const getAllocatedSharesPerClass = useCallback((): Record<string, number> => {
      const allocated: Record<string, number> = {};
      
      if (!currentCompany) return allocated;
      
      // Initialize all possible classes
      const allClasses = ["A", "B", "C", "Ordinary"];
      allClasses.forEach(cls => allocated[cls] = 0);
      
      // Sum from shareHolders (persons)
      if (Array.isArray(currentCompany.shareHolders)) {
        currentCompany.shareHolders.forEach((sh: any) => {
          if (Array.isArray(sh.sharesData)) {
            sh.sharesData.forEach((sd: any) => {
              const shareClass = sd.shareClass || sd.class || "A";
              allocated[shareClass] = (allocated[shareClass] || 0) + (Number(sd.totalShares) || 0);
            });
          }
        });
      }
      
      // Sum from shareHoldingCompanies
      if (Array.isArray(currentCompany.shareHoldingCompanies)) {
        currentCompany.shareHoldingCompanies.forEach((sh: any) => {
          if (Array.isArray(sh.sharesData)) {
            sh.sharesData.forEach((sd: any) => {
              const shareClass = sd.shareClass || sd.class || "A";
              allocated[shareClass] = (allocated[shareClass] || 0) + (Number(sd.totalShares) || 0);
            });
          }
        });
      }
      
      return allocated;
    }, [currentCompany]);
  
    // Calculate available shares per class
    const getAvailableSharesPerClass = useCallback((): Record<string, number> => {
      const available: Record<string, number> = {};
      const allocated = getAllocatedSharesPerClass();
      
      if (!currentCompany?.totalShares || !Array.isArray(currentCompany.totalShares)) {
        return available;
      }
      
      // Get total shares per class from company
      currentCompany.totalShares.forEach((share: any) => {
        const shareClass = share.class || "A";
        const total = Number(share.totalShares) || 0;
        const allocatedForClass = allocated[shareClass] || 0;
        available[shareClass] = Math.max(0, total - allocatedForClass);
      });
      
      return available;
    }, [currentCompany, getAllocatedSharesPerClass]);
    

    const getFormAllocatedSharesPerClass = useCallback((): Record<string, number> => {
      const formAllocated: Record<string, number> = {};
      const allClasses = ["A", "B", "C", "Ordinary"];
      allClasses.forEach(cls => formAllocated[cls] = 0);
      
      // Sum from selected existing entities
      selectedExistingEntities.forEach((entity) => {
        if (entity.sharesData && Array.isArray(entity.sharesData)) {
          entity.sharesData.forEach((sd: ShareDataItem) => {
            const shareClass = sd.shareClass || "A";
            formAllocated[shareClass] = (formAllocated[shareClass] || 0) + (Number(sd.totalShares) || 0);
          });
        }
      });
      
      // Sum from new entities
      newEntities.forEach((entity) => {
        if (entity.sharesData && Array.isArray(entity.sharesData)) {
          entity.sharesData.forEach((sd: ShareDataItem) => {
            const shareClass = sd.shareClass || "A";
            formAllocated[shareClass] = (formAllocated[shareClass] || 0) + (Number(sd.totalShares) || 0);
          });
        }
      });
      
      return formAllocated;
    }, [selectedExistingEntities, newEntities]);

  // Validate shares and update error state
  const validateShares = useCallback(() => {
    const errors: Record<string, string> = {};
    const availableSharesPerClass = getAvailableSharesPerClass();
    const formAllocatedPerClass = getFormAllocatedSharesPerClass();
    
    // Validate per-class limits
    Object.keys(formAllocatedPerClass).forEach((shareClass) => {
      const formAllocated = formAllocatedPerClass[shareClass] || 0;
      const available = availableSharesPerClass[shareClass] || 0;
      
      if (formAllocated > available) {
        const exceeded = formAllocated - available;
        errors[`class_${shareClass}`] = `Exceeds available ${shareClass} shares by ${exceeded.toLocaleString()}. Available: ${available.toLocaleString()}`;
      }
    });
    
    setShareValidationErrors(errors);
    
    return Object.keys(errors).length === 0;
  }, [selectedExistingEntities, newEntities, currentCompany, getAvailableSharesPerClass, getFormAllocatedSharesPerClass]);
  

  const formContent = (
    <div className={`${inline ? '' : 'max-w-5xl max-h-[90vh]'} overflow-y-auto`}>
      <div className={inline ? 'p-0' : ''}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            Add {entityType === "person" ? "Person" : "Company"} Representative
          </h2>
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("existing")}
              className={`
                rounded-md px-3
                ${viewMode === "existing"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 "
                }
              `}
            >
              Existing
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("new")}
              className={`
                rounded-md px-3
                ${viewMode === "new"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
                }
              `}
            >
              Create New
            </Button>
          </div>
        </div>

        <div className="space-y-6 mt-4">
          {/* Select Existing Entity Section */}
          {viewMode === "existing" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Select Existing {entityType === "person" ? "Person" : "Company"}
              </h3>
            </div>

            {/* Companies: Always show global search */}
            {entityType === "company" && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Search companies globally..."
                      value={searchQuery}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSearchQuery(value);
                        // Clear results when input is cleared
                        if (!value.trim()) {
                          setSearchResults([]);
                          setHasSearched(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleGlobalSearch();
                        }
                      }}
                      className="rounded-xl"
                    />
                    <Button
                      onClick={() => handleGlobalSearch()}
                      disabled={isSearching || !searchQuery.trim()}
                      className="rounded-xl"
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {searchQuery.trim() && filteredSearchResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {filteredSearchResults.map((entity) => {
                        const entityId = entity._id || entity.id;
                        const isSelected = selectedExistingEntities.some((e) => e.id === entityId);
                        const selectedEntity = selectedExistingEntities.find((e) => e.id === entityId);

                      return (
                        <div key={entityId} className="space-y-2">
                          <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleExistingEntityToggle(entity)}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{entity.name}</p>
                              {entity.registrationNumber && (
                                <p className="text-sm text-gray-500">
                                  {entity.registrationNumber}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExistingEntityExpanded(entityId)}
                              >
                                {expandedEntities.has(entityId) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>

                          {isSelected && expandedEntities.has(entityId) && selectedEntity && (
                            <Card className="ml-8 mb-2">
                              <CardContent className="p-4">
                                <Label className="text-sm font-semibold mb-3 block">
                                  Select Roles (at least one required)
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                  {REPRESENTATIVE_ROLES.map((role) => (
                                    <div key={role} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={selectedEntity.roles.includes(role)}
                                        onCheckedChange={() =>
                                          handleExistingEntityRoleToggle(entityId, role)
                                        }
                                      />
                                      <Label className="text-sm font-normal cursor-pointer">
                                        {role}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                                {selectedEntity.roles.length === 0 && (
                                  <p className="text-xs text-red-600 mt-2">
                                    Please select at least one role
                                  </p>
                                )}
                                
                                {/* Shares Input Section */}
                                {/* <div className="border-t pt-4 mt-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <Label className="text-sm font-semibold">
                                      Enter Shares {getAvailableShareClasses().length > 1 && "(at least one required)"}
                                    </Label>
                                  </div>
                                  {shareValidationErrors.global && (
                                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                                      <p className="text-sm text-red-600">{shareValidationErrors.global}</p>
                                    </div>
                                  )}
                                  <div className="space-y-3">
                                    <div className={`grid gap-3 ${getAvailableShareClasses().length === 1 ? "grid-cols-1" : getAvailableShareClasses().length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                                      {getAvailableShareClasses().map((shareClass) => {
                                        const availableShares = getAvailableSharesPerClass();
                                        const formAllocatedPerClass = getFormAllocatedSharesPerClass();
                                        const available = availableShares[shareClass] || 0;
                                        const allocated = formAllocatedPerClass[shareClass] || 0;
                                        const remaining = Math.max(0, available - allocated);
                                        
                                        // Get value from sharesData or class fields
                                        let value = 0;
                                        if (shareClass === "Ordinary") {
                                          const ordinaryShare = selectedEntity.sharesData?.find((sd: ShareDataItem) => 
                                            sd.shareClass === "Ordinary"
                                          );
                                          value = ordinaryShare ? Number(ordinaryShare.totalShares) || 0 : 0;
                                        } else if (shareClass === "A") {
                                          value = selectedEntity.classAShares || 0;
                                        } else if (shareClass === "B") {
                                          value = selectedEntity.classBShares || 0;
                                        } else if (shareClass === "C") {
                                          value = selectedEntity.classCShares || 0;
                                        }
                                        
                                        const errorKey = `class_${shareClass}`;
                                        const hasError = shareValidationErrors[errorKey];
                                        
                                        const handleChange = (newValue: number) => {
                                          if (shareClass === "Ordinary") {
                                            const updatedSharesData = [...(selectedEntity.sharesData || [])];
                                            const existingIndex = updatedSharesData.findIndex((sd: ShareDataItem) => 
                                              sd.shareClass === "Ordinary"
                                            );
                                            
                                            if (newValue > 0) {
                                              const newShareItem: ShareDataItem = {
                                                totalShares: newValue,
                                                shareClass: "Ordinary",
                                                shareType: "Ordinary"
                                              };
                                              if (existingIndex >= 0) {
                                                updatedSharesData[existingIndex] = newShareItem;
                                              } else {
                                                updatedSharesData.push(newShareItem);
                                              }
                                            } else {
                                              if (existingIndex >= 0) {
                                                updatedSharesData.splice(existingIndex, 1);
                                              }
                                            }
                                            
                                            setSelectedExistingEntities(
                                              selectedExistingEntities.map((e) =>
                                                e.id === entityId ? { ...e, sharesData: updatedSharesData } : e
                                              )
                                            );
                                          } else if (shareClass === "A" || shareClass === "B" || shareClass === "C") {
                                            handleExistingEntityClassSharesChange(
                                              entityId,
                                              shareClass,
                                              newValue
                                            );
                                          }
                                        };
                                        
                                        return (
                                          <div key={shareClass}>
                                            <Label className="text-xs text-gray-600">
                                              {shareClass === "Ordinary" ? "Ordinary Shares" : `Class ${shareClass} Shares`}
                                            </Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              step="1"
                                              placeholder="0"
                                              value={value || ""}
                                              onChange={(e) => handleChange(Number(e.target.value) || 0)}
                                              className={`rounded-lg ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                              {allocated > 0 ? (
                                                <>Remaining: {remaining.toLocaleString()} shares (Total: {available.toLocaleString()}, Allocated: {allocated.toLocaleString()})</>
                                              ) : (
                                                <>Available: {available.toLocaleString()} shares</>
                                              )}
                                            </p>
                                            {hasError && (
                                              <p className="text-xs text-red-600 mt-1">
                                                {shareValidationErrors[errorKey]}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {shareValidationErrors.global && (
                                      <p className="text-xs text-red-600">
                                        {shareValidationErrors.global}
                                      </p>
                                    )}
                                  </div>
                                </div> */}
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      );
                    })}
                    {searchPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = searchPagination.page - 1;
                            setSearchPagination((prev) => ({ ...prev, page: newPage }));
                            handleGlobalSearch(newPage);
                          }}
                          disabled={searchPagination.page === 1}
                          className="rounded-xl"
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-500">
                          Page {searchPagination.page} of {searchPagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = searchPagination.page + 1;
                            setSearchPagination((prev) => ({ ...prev, page: newPage }));
                            handleGlobalSearch(newPage);
                          }}
                          disabled={searchPagination.page >= searchPagination.totalPages}
                          className="rounded-xl"
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {searchQuery.trim() && filteredSearchResults.length === 0 && !isSearching && hasSearched && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No results found. Try a different search query.
                  </p>
                )}
              </>
            )}

            {/* Persons: Always show existing list (no global search) */}
            {entityType === "person" && (
              <>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {existingEntities.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No persons found
                      </p>
                    ) : (
                      existingEntities.map((entity) => {
                        const entityId = entity._id || entity.id;
                        const isSelected = selectedExistingEntities.some((e) => e.id === entityId);
                        const selectedEntity = selectedExistingEntities.find((e) => e.id === entityId);

                        return (
                          <div key={entityId} className="space-y-2">
                            <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleExistingEntityToggle(entity)}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{entity.name}</p>
                              </div>
                              {entity.sourceCompany && entity.sourceCompany.id !== companyId && (
                                <Badge variant="outline" className="text-xs">
                                  {entity.sourceCompany.name}
                                </Badge>
                              )}
                              {isSelected && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExistingEntityExpanded(entityId)}
                                >
                                  {expandedEntities.has(entityId) ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>

                            {isSelected && expandedEntities.has(entityId) && selectedEntity && (
                              <Card className="ml-8 mb-2">
                                <CardContent className="p-4">
                                  <Label className="text-sm font-semibold mb-3 block">
                                    Select Roles (at least one required)
                                  </Label>
                                  <div className="grid grid-cols-2 gap-3">
                                    {REPRESENTATIVE_ROLES.map((role) => (
                                      <div key={role} className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={selectedEntity.roles.includes(role)}
                                          onCheckedChange={() =>
                                            handleExistingEntityRoleToggle(entityId, role)
                                          }
                                        />
                                        <Label className="text-sm font-normal cursor-pointer">
                                          {role}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                  {selectedEntity.roles.length === 0 && (
                                    <p className="text-xs text-red-600 mt-2">
                                      Please select at least one role
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                            
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          )}

          {/* Create New Entity Section */}
          {viewMode === "new" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New {entityType === "person" ? "Person" : "Company"}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddNewEntity}
                className="rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Representative {entityType === "person" ? "Person" : "Company"}
              </Button>
            </div>

            <div className={`grid gap-4 ${newEntities.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {newEntities.map((entity, index) => (
                <Card key={index} className="relative min-w-[300px]">
                  <CardContent className="p-4 space-y-4">
                    {newEntities.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => handleRemoveNewEntity(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          {entityType === "person" ? "Name" : "Company Name"}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder={
                            entityType === "person"
                              ? "Enter person name"
                              : "Enter company name"
                          }
                          value={entity.name}
                          onChange={(e) =>
                            handleNewEntityChange(index, "name", e.target.value)
                          }
                          className="rounded-xl"
                        />
                      </div>

                      {entityType === "person" ? (
                        <div className="space-y-2">
                          <Label>
                            Nationality <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={entity.nationality}
                            onValueChange={(value) =>
                              handleNewEntityChange(index, "nationality", value)
                            }
                          >
                            <SelectTrigger className="rounded-xl">
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
                      ) : (
                        <div className="space-y-2">
                          <Label>
                            Registration Number <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="Enter registration number"
                            value={entity.registrationNumber || ""}
                            onChange={(e) =>
                              handleNewEntityChange(index, "registrationNumber", e.target.value)
                            }
                            className="rounded-xl"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Address <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        placeholder="Enter address"
                        value={entity.address}
                        onChange={(e) =>
                          handleNewEntityChange(index, "address", e.target.value)
                        }
                        className="rounded-xl"
                        rows={2}
                      />
                    </div>

                    {entityType === "person" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            placeholder="Enter email"
                            value={entity.email || ""}
                            onChange={(e) =>
                              handleNewEntityChange(index, "email", e.target.value)
                            }
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            placeholder="Enter phone number"
                            value={entity.phoneNumber || ""}
                            onChange={(e) =>
                              handleNewEntityChange(index, "phoneNumber", e.target.value)
                            }
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                    )}

                    {entityType === "company" && (
                      <>
                        <div className="space-y-2">
                          <Label>Industry</Label>
                          <Select
                            value={entity.industry || ""}
                            onValueChange={(value) => {
                              handleNewEntityChange(index, "industry", value);
                              if (value !== "Other") {
                                handleNewEntityChange(index, "customIndustry", "");
                              }
                            }}
                          >
                            <SelectTrigger className="rounded-xl border-gray-200 text-left">
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
                          {entity.industry === "Other" && (
                            <Input
                              placeholder="Enter custom industry"
                              value={entity.customIndustry || ""}
                              onChange={(e) =>
                                handleNewEntityChange(index, "customIndustry", e.target.value)
                              }
                              className="rounded-xl border-gray-200"
                            />
                          )}
                        </div>

                        {/* Total Shares Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-gray-700 font-semibold">
                              Total Shares
                            </Label>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-600">
                                Total:{" "}
                                {entity.shareClassValues
                                  ? calculateTotalSharesSum(
                                      entity.shareClassValues,
                                      entity.useClassShares || false
                                    ).toLocaleString()
                                  : "0"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Share Classes</span>
                                <Switch
                                  checked={entity.useClassShares || false}
                                  onCheckedChange={(checked) =>
                                    handleShareClassToggle(index, checked)
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          {/* Dynamic Share Class Inputs */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {SHARE_CLASS_CONFIG.map(({ key, label }) => {
                              const isOrdinary = key === "ordinary";
                              const shouldRender = isOrdinary
                                ? !(entity.useClassShares || false)
                                : (entity.useClassShares || false) &&
                                  (entity.visibleShareClasses || []).includes(label);

                              if (!shouldRender || !entity.shareClassValues) {
                                return null;
                              }

                              const value = entity.shareClassValues[key];

                              return (
                                <div className="space-y-2" key={key}>
                                  <div className="flex items-center justify-between">
                                    <Label
                                      htmlFor={`${index}-${key}`}
                                      className="text-gray-700 font-semibold"
                                    >
                                      {label}
                                    </Label>
                                  </div>
                                  <Input
                                    id={`${index}-${key}`}
                                    min={0}
                                    type="number"
                                    step={1}
                                    placeholder={`Enter ${label} shares`}
                                    value={value === 0 ? "" : value}
                                    onChange={(e) =>
                                      handleShareValueChange(
                                        index,
                                        key,
                                        label,
                                        e.target.value
                                      )
                                    }
                                    className="rounded-xl border-gray-200"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {entityType === "company" && (
                      <div className="space-y-2">
                        <Label>Company Summary</Label>
                        <Textarea
                          placeholder="Provide a brief overview"
                          value={entity.description || ""}
                          onChange={(e) =>
                            handleNewEntityChange(index, "description", e.target.value)
                          }
                          className="rounded-xl"
                          rows={3}
                        />
                      </div>
                    )}

                    {entityType === "company" && (
                      <div className="space-y-2">
                        <Label>Company Start Date</Label>
                        <Input
                          type="date"
                          value={entity.companyStartedAt || ""}
                          onChange={(e) =>
                            handleNewEntityChange(index, "companyStartedAt", e.target.value)
                          }
                          className="rounded-xl"
                        />
                      </div>
                    )}


                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm font-semibold">
                        Select Roles (at least one required) <span className="text-red-500">*</span>
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        {REPRESENTATIVE_ROLES.map((role) => (
                          <div key={role} className="flex items-center space-x-2">
                            <Checkbox
                              checked={entity.roles.includes(role)}
                              onCheckedChange={() =>
                                handleNewEntityRoleToggle(index, role)
                              }
                            />
                            <Label className="text-sm font-normal cursor-pointer">
                              {role}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {entity.roles.length === 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Please select at least one role
                        </p>
                      )}
                    </div>
               
                    {/* Shares Data - Only show for companies */}
                    {entityType === "company" && (
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-semibold">
                            Shares {getAvailableShareClasses().length > 1 && "(at least one required)"}
                          </Label>
                        </div>
                        {shareValidationErrors.global && (
                          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{shareValidationErrors.global}</p>
                          </div>
                        )}
                        <div className="space-y-3">
                          <div className={`grid gap-3 ${getAvailableShareClasses().length === 1 ? "grid-cols-1" : getAvailableShareClasses().length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                            {getAvailableShareClasses().map((shareClass) => {
                              const availableShares = getAvailableSharesPerClass();
                              const formAllocatedPerClass = getFormAllocatedSharesPerClass();
                              const available = availableShares[shareClass] || 0;
                              const allocated = formAllocatedPerClass[shareClass] || 0;
                              const remaining = Math.max(0, available - allocated);
                              
                              // Get value from sharesData or class fields
                              let value = 0;
                              if (shareClass === "Ordinary") {
                                // For Ordinary, check sharesData
                                const ordinaryShare = entity.sharesData?.find((sd: ShareDataItem) => 
                                  sd.shareClass === "Ordinary"
                                );
                                value = ordinaryShare ? Number(ordinaryShare.totalShares) || 0 : 0;
                              } else if (shareClass === "A") {
                                value = entity.classAShares || 0;
                              } else if (shareClass === "B") {
                                value = entity.classBShares || 0;
                              } else if (shareClass === "C") {
                                value = entity.classCShares || 0;
                              }
                              
                              const errorKey = `class_${shareClass}`;
                              const hasError = shareValidationErrors[errorKey];
                              
                              const handleChange = (newValue: number) => {
                                if (shareClass === "Ordinary") {
                                  // For Ordinary, update sharesData directly
                                  const updatedSharesData = [...(entity.sharesData || [])];
                                  const existingIndex = updatedSharesData.findIndex((sd: ShareDataItem) => 
                                    sd.shareClass === "Ordinary"
                                  );
                                  
                                  if (newValue > 0) {
                                    const newShareItem: ShareDataItem = {
                                      totalShares: newValue,
                                      shareClass: "Ordinary",
                                      shareType: "Ordinary"
                                    };
                                    if (existingIndex >= 0) {
                                      updatedSharesData[existingIndex] = newShareItem;
                                    } else {
                                      updatedSharesData.push(newShareItem);
                                    }
                                  } else {
                                    if (existingIndex >= 0) {
                                      updatedSharesData.splice(existingIndex, 1);
                                    }
                                  }
                                  
                                  handleNewEntityChange(index, "sharesData", updatedSharesData);
                                } else if (shareClass === "A" || shareClass === "B" || shareClass === "C") {
                                  // For A, B, C, use existing handler
                                  handleNewEntityClassSharesChange(
                                    index,
                                    shareClass,
                                    newValue
                                  );
                                }
                              };
                              
                              return (
                                <div key={shareClass}>
                                  <Label className="text-xs text-gray-600">
                                    {shareClass === "Ordinary" ? "Ordinary Shares" : `Class ${shareClass} Shares`}
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={value || ""}
                                    onChange={(e) => handleChange(Number(e.target.value) || 0)}
                                    className={`rounded-lg ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {allocated > 0 ? (
                                      <>Remaining: {remaining.toLocaleString()} shares (Total: {available.toLocaleString()}, Allocated: {allocated.toLocaleString()})</>
                                    ) : (
                                      <>Available: {available.toLocaleString()} shares</>
                                    )}
                                  </p>
                                  {hasError && (
                                    <p className="text-xs text-red-600 mt-1">
                                      {shareValidationErrors[errorKey]}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {shareValidationErrors.global && (
                            <p className="text-xs text-red-600">
                              {shareValidationErrors.global}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          )}
        </div>

        <div className={`${inline ? 'flex gap-2 mt-6' : 'mt-6'}`}>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(shareValidationErrors).length > 0}
            className="bg-brand-hover hover:bg-brand-sidebar text-white rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Added Representatives"
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return formContent;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        {formContent}
      </DialogContent>
    </Dialog>
  );
};

