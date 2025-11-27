import { useState, useEffect, useCallback } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Building2, Plus, X, ChevronDown, ChevronUp, Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ShareClassInput,
  type ShareClassValues,
  type ShareClassErrors,
  getDefaultShareClassValues,
  getDefaultShareClassErrors,
  buildTotalSharesPayload,
  calculateTotalSharesSum,
  parseTotalSharesArray,
  OPTIONAL_SHARE_CLASS_LABELS,
  DEFAULT_SHARE_TYPE,
} from "./ShareClassInput";

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

import {
  addShareHolderPersonNew,
  updateShareHolderPersonExisting,
  addShareHolderCompanyNew,
  updateShareHolderCompanyExisting,
  type ShareDataItem,
  searchCompaniesGlobal,
  searchPersonsGlobal,
} from "@/lib/api/company";
import { fetchCompanies } from "@/lib/api/company";

interface AddShareholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  companyId: string;
  entityType: "person" | "company";
  companyTotalShares?: number;
  existingSharesTotal?: number;
  inline?: boolean; // When true, renders without Dialog wrapper
}

interface ExistingEntity {
  id: string;
  name: string;
  type: "person" | "company";
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
}

export const AddShareholderModal: React.FC<AddShareholderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  companyId,
  entityType,
  companyTotalShares = 0,
  existingSharesTotal = 0,
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
      classAShares: 0,
      classBShares: 0,
      classCShares: 0,
      sharesData: [{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }],
      // Only initialize shareClassValues for companies (for their own totalShares)
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
  const [shareValidationErrors, setShareValidationErrors] = useState<Record<string, string>>({});
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  
  // View mode: "existing" or "new"
  const [viewMode, setViewMode] = useState<"existing" | "new">("existing");
  
  // Global search state
  const [isGlobalSearchMode, setIsGlobalSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPagination, setSearchPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  const { toast } = useToast();

  // Reset global search mode when switching to person mode
  useEffect(() => {
    if (entityType === "person" && isGlobalSearchMode) {
      setIsGlobalSearchMode(false);
      setSearchQuery("");
      setSearchResults([]);
      setSearchPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    }
  }, [entityType, isGlobalSearchMode]);

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

  // Calculate form-allocated shares per class (from selected existing + new entities)
  const getFormAllocatedSharesPerClass = useCallback((): Record<string, number> => {
    const formAllocated: Record<string, number> = {};
    const allClasses = ["A", "B", "C", "Ordinary"];
    allClasses.forEach(cls => formAllocated[cls] = 0);
    
    // Sum from selected existing entities
    selectedExistingEntities.forEach((entity) => {
      entity.sharesData.forEach((sd) => {
        const shareClass = sd.shareClass || "A";
        formAllocated[shareClass] = (formAllocated[shareClass] || 0) + (Number(sd.totalShares) || 0);
      });
    });
    
    // Sum from new entities
    newEntities.forEach((entity) => {
      entity.sharesData.forEach((sd) => {
        const shareClass = sd.shareClass || "A";
        formAllocated[shareClass] = (formAllocated[shareClass] || 0) + (Number(sd.totalShares) || 0);
      });
    });
    
    return formAllocated;
  }, [selectedExistingEntities, newEntities]);

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

  // Validate shares and update error state
  const validateShares = useCallback(() => {
    const errors: Record<string, string> = {};
    const availableSharesPerClass = getAvailableSharesPerClass();
    const formAllocatedPerClass = getFormAllocatedSharesPerClass();
    const allocatedPerClass = getAllocatedSharesPerClass();
    
    // Validate per-class limits
    Object.keys(formAllocatedPerClass).forEach((shareClass) => {
      const formAllocated = formAllocatedPerClass[shareClass] || 0;
      const available = availableSharesPerClass[shareClass] || 0;
      
      if (formAllocated > available) {
        const exceeded = formAllocated - available;
        errors[`class_${shareClass}`] = `Exceeds available ${shareClass} shares by ${exceeded.toLocaleString()}. Available: ${available.toLocaleString()}`;
      }
    });
    
    // Also check total for backward compatibility
    const totalShares = companyTotalShares || 0;
    let occupiedShares = 0;
    if (currentCompany) {
      if (Array.isArray(currentCompany.shareHolders)) {
        currentCompany.shareHolders.forEach((sh: any) => {
          if (Array.isArray(sh.sharesData)) {
            sh.sharesData.forEach((sd: any) => {
              occupiedShares += Number(sd.totalShares) || 0;
            });
          }
        });
      }
      if (Array.isArray(currentCompany.shareHoldingCompanies)) {
        currentCompany.shareHoldingCompanies.forEach((sh: any) => {
          if (Array.isArray(sh.sharesData)) {
            sh.sharesData.forEach((sd: any) => {
              occupiedShares += Number(sd.totalShares) || 0;
            });
          }
        });
      }
    }
    
    let formShares = 0;
    selectedExistingEntities.forEach((entity) => {
      entity.sharesData.forEach((sd) => {
        formShares += Number(sd.totalShares) || 0;
      });
    });
    newEntities.forEach((entity) => {
      entity.sharesData.forEach((sd) => {
        formShares += Number(sd.totalShares) || 0;
      });
    });
    
    const remainingShares = totalShares - occupiedShares;
    const totalAfterForm = occupiedShares + formShares;
    
    if (totalAfterForm > totalShares && Object.keys(errors).length === 0) {
      const exceeded = totalAfterForm - totalShares;
      errors.global = `Total shares exceed available shares by ${exceeded.toLocaleString()}. Remaining: ${remainingShares.toLocaleString()}`;
    }
    
    setShareValidationErrors(errors);
    
    return Object.keys(errors).length === 0;
  }, [selectedExistingEntities, newEntities, currentCompany, companyTotalShares, getAvailableSharesPerClass, getFormAllocatedSharesPerClass, getAllocatedSharesPerClass]);

  // Fetch existing entities
  useEffect(() => {
    if (isOpen) {
      fetchExistingEntities();
    }
  }, [isOpen, entityType, clientId, companyId]);

  // Validate shares when entities or currentCompany changes
  useEffect(() => {
    if (isOpen && currentCompany) {
      validateShares();
    }
  }, [isOpen, currentCompany, validateShares]);

  const fetchExistingEntities = async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      if (entityType === "person") {
        // Fetch all persons for the company (which returns all persons for the client)
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
        const allPersons = result.data || [];

        // Get current company to filter out existing shareholders
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
          const companyData = companyResult.data || {};
          setCurrentCompany(companyData);
          const existingShareholderIds = new Set(
            (companyData.shareHolders || []).map((sh: any) => {
              const personId = sh?.personId?._id || sh?.personId?.id || sh?.personId;
              return String(personId);
            })
          );

          const filteredPersons = allPersons.filter((person: any) => {
            const personId = person._id || person.id;
            return !existingShareholderIds.has(String(personId));
          });

          setExistingEntities(filteredPersons);
        } else {
          setExistingEntities(allPersons);
        }
      } else {
        const result = await fetchCompanies(clientId);
        const allCompanies = result.data || [];

        // Get current company to filter out existing shareholders
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
          const companyData = companyResult.data || {};
          setCurrentCompany(companyData);
          const existingShareholderIds = new Set(
            (companyData.shareHoldingCompanies || []).map((sh: any) => {
              const compId = sh?.companyId?._id || sh?.companyId?.id || sh?.companyId;
              return String(compId);
            })
          );

          const filteredCompanies = allCompanies.filter((company: any) => {
            const compId = company._id || company.id;
            return compId !== companyId && !existingShareholderIds.has(String(compId));
          });

          setExistingEntities(filteredCompanies);
        } else {
          setExistingEntities(allCompanies.filter((c: any) => c._id !== companyId && c.id !== companyId));
        }
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

  // Get remaining shares for display
  const getRemainingShares = (): number => {
    const totalShares = companyTotalShares || 0;
    
    // Calculate occupied shares from current company
    let occupiedShares = 0;
    if (currentCompany) {
      if (Array.isArray(currentCompany.shareHolders)) {
        currentCompany.shareHolders.forEach((sh: any) => {
          if (Array.isArray(sh.sharesData)) {
            sh.sharesData.forEach((sd: any) => {
              occupiedShares += Number(sd.totalShares) || 0;
            });
          }
        });
      }
      if (Array.isArray(currentCompany.shareHoldingCompanies)) {
        currentCompany.shareHoldingCompanies.forEach((sh: any) => {
          if (Array.isArray(sh.sharesData)) {
            sh.sharesData.forEach((sd: any) => {
              occupiedShares += Number(sd.totalShares) || 0;
            });
          }
        });
      }
    }
    
    // Calculate form shares
    let formShares = 0;
    selectedExistingEntities.forEach((entity) => {
      entity.sharesData.forEach((sd) => {
        formShares += Number(sd.totalShares) || 0;
      });
    });
    newEntities.forEach((entity) => {
      entity.sharesData.forEach((sd) => {
        formShares += Number(sd.totalShares) || 0;
      });
    });
    
    return totalShares - occupiedShares - formShares;
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

  const addNewEntityForm = () => {
    setNewEntities([
      ...newEntities,
      {
        name: "",
        nationality: "",
        address: "",
        classAShares: 0,
        classBShares: 0,
        classCShares: 0,
        sharesData: [{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }],
        // Only initialize shareClassValues for companies (for their own totalShares)
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

  const removeNewEntityForm = (index: number) => {
    if (newEntities.length > 1) {
      setNewEntities(newEntities.filter((_, i) => i !== index));
    }
  };

  const validateForm = (): string | null => {
    // Validate shares don't exceed remaining
    if (!validateShares()) {
      return shareValidationErrors.global || "Total shares exceed available shares";
    }
    
    // Validate existing entities have at least one sharesData with totalShares > 0
    for (const entity of selectedExistingEntities) {
      const hasValidShares = entity.sharesData.some(
        (sd) => Number(sd.totalShares) > 0
      );
      if (!hasValidShares) {
        return `Please enter shares for ${entity.name}`;
      }
    }

    // Filter out empty new entity forms (only validate entities that have at least some data)
    const filledNewEntities = newEntities.filter((entity) => {
      const hasName = entity.name.trim().length > 0;
      const hasAddress = entity.address.trim().length > 0;
      const hasNationality = entityType === "person" ? entity.nationality.length > 0 : false;
      const hasRegistrationNumber = entityType === "company" ? (entity.registrationNumber?.trim().length || 0) > 0 : false;
      const hasShares = entity.sharesData.some((sd) => Number(sd.totalShares) > 0);

      return hasName || hasAddress || hasNationality || hasRegistrationNumber || hasShares;
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
      }
      if (!entity.address.trim()) {
        return `Please enter address for ${entity.name || `new ${entityType} #${i + 1}`}`;
      }
      const hasValidShares = entity.sharesData.some((sd) => Number(sd.totalShares) > 0);
      if (!hasValidShares) {
        return `Please enter shares for ${entity.name || `new ${entityType} #${i + 1}`}`;
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
        // Get current company to check if entities are already shareholders
        const companyResponse = await fetch(
          `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
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

        if (entityType === "person") {
          const existingShareholderIds = new Set(
            (currentCompany?.shareHolders || []).map((sh: any) => {
              const personId = sh?.personId?._id || sh?.personId?.id || sh?.personId;
              return String(personId);
            })
          );

          for (const entity of selectedExistingEntities) {
            // Filter out sharesData with totalShares = 0
            const validSharesData = entity.sharesData.filter((sd) => Number(sd.totalShares) > 0);
            if (validSharesData.length > 0) {
              if (existingShareholderIds.has(String(entity.id))) {
                // Update existing shareholder
                await updateShareHolderPersonExisting(clientId, companyId, entity.id, {
                  sharesData: validSharesData,
                });
              } else {
                // Add new shareholder
                await addShareHolderPersonNew(clientId, companyId, {
                  personId: entity.id,
                  sharesData: validSharesData,
                });
              }
            }
          }
        } else {
          const existingShareholderIds = new Set(
            (currentCompany?.shareHoldingCompanies || []).map((sh: any) => {
              const compId = sh?.companyId?._id || sh?.companyId?.id || sh?.companyId;
              return String(compId);
            })
          );

          for (const entity of selectedExistingEntities) {
            // Filter out sharesData with totalShares = 0
            const validSharesData = entity.sharesData.filter((sd) => Number(sd.totalShares) > 0);
            if (validSharesData.length > 0) {
              if (existingShareholderIds.has(String(entity.id))) {
                // Update existing shareholder
                await updateShareHolderCompanyExisting(clientId, companyId, entity.id, {
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

      // Process new entities
      const filledNewEntities = newEntities.filter((entity) => {
        const hasName = entity.name.trim().length > 0;
        const hasAddress = entity.address.trim().length > 0;
        const hasNationality = entityType === "person" ? entity.nationality.length > 0 : false;
        const hasRegistrationNumber = entityType === "company" ? (entity.registrationNumber?.trim().length || 0) > 0 : false;
        return hasName || hasAddress || hasNationality || hasRegistrationNumber;
      });

      if (filledNewEntities.length > 0) {
        if (entityType === "person") {
          for (const entity of filledNewEntities) {
            // Create person first
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
                  email: entity.email,
                  phoneNumber: entity.phoneNumber,
                }),
              }
            );

            if (!personResponse.ok) {
              const error = await personResponse.json();
              throw new Error(error.message || "Failed to create person");
            }

            const personResult = await personResponse.json();
            const personId = personResult.data?._id || personResult.data?.id;

            // Filter out sharesData with totalShares = 0
            const validSharesData = entity.sharesData.filter((sd) => Number(sd.totalShares) > 0);
            if (validSharesData.length > 0) {
              // Then add as shareholder
              await addShareHolderPersonNew(clientId, companyId, {
                personId,
                sharesData: validSharesData,
              });
            }
          }
        } else {
          for (const entity of filledNewEntities) {
            // Create company first
            // Build totalShares payload with only the selected mode's data
            const totalSharesPayload = entity.shareClassValues && entity.useClassShares !== undefined
              ? buildTotalSharesPayload(entity.shareClassValues, entity.useClassShares)
              : undefined;

            const companyResponse = await fetch(
              `${import.meta.env.VITE_APIURL}/api/client/${"non-primary"}/company`,
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
                  description: entity.description,
                  timelineStart: entity.companyStartedAt,
                }),
              }
            );

            if (!companyResponse.ok) {
              const error = await companyResponse.json();
              throw new Error(error.message || "Failed to create company");
            }

            const companyResult = await companyResponse.json();
            const addingCompanyId = companyResult.data?._id || companyResult.data?.id;

            // Filter out sharesData with totalShares = 0
            const validSharesData = entity.sharesData.filter((sd) => Number(sd.totalShares) > 0);
            if (validSharesData.length > 0) {
              // Then add as shareholder
              await addShareHolderCompanyNew(clientId, companyId, {
                companyId: addingCompanyId,
                sharesData: validSharesData,
              });
            }
          }
        }
      }

      toast({
        title: "Success",
        description: `${entityType === "person" ? "Person" : "Company"} shareholder(s) added successfully`,
      });

      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error("Error adding shareholder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add shareholder",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Global search function
  const handleGlobalSearch = async (pageOverride?: number) => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSearching(true);
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
    } finally {
      setIsSearching(false);
    }
  };

  const handleExitGlobalSearch = () => {
    setIsGlobalSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
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
    setSearchPagination({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
    onClose();
  };

  if (!isOpen) return null;

  const formContent = (
    <div className={`${inline ? '' : 'max-w-5xl max-h-[90vh]'} overflow-y-auto`}>
      <div className={inline ? 'p-0' : ''}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            Add {entityType === "person" ? "Person" : "Company"} Shareholder
          </h2>
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Button
              type="button"
              variant={viewMode === "existing" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("existing")}
              className={`rounded-md ${
                viewMode === "existing"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Existing
            </Button>
            <Button
              type="button"
              variant={viewMode === "new" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("new")}
              className={`rounded-md ${
                viewMode === "new"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
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
              {!isGlobalSearchMode && entityType === "company" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGlobalSearchMode(true)}
                  className="rounded-xl"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Globally
                </Button>
              )}
            </div>

            {isGlobalSearchMode && entityType === "company" ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExitGlobalSearch}
                    className="rounded-xl"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Search companies globally..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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
                
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {searchResults.map((entity) => {
                      const entityId = entity._id || entity.id;
                      const isSelected = selectedExistingEntities.some((e) => e.id === entityId);
                      const selectedEntity = selectedExistingEntities.find((e) => e.id === entityId);
                      const isExpanded = expandedEntities.has(entityId);

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
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>

                          {isSelected && isExpanded && selectedEntity && (
                            <Card className="ml-8 mb-2">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <Label className="text-sm font-semibold">
                                    Enter Shares {getAvailableShareClasses().length > 1 && "(at least one required)"}
                                  </Label>
                                  <div className="text-xs text-gray-500">
                                    Remaining: {getRemainingShares().toLocaleString()} shares
                                  </div>
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
                
                {searchResults.length === 0 && !isSearching && searchQuery && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No results found. Try a different search query.
                  </p>
                )}
              </>
            ) : (
              <>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2 border rounded-lg p-4">
                    {existingEntities.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No {entityType === "person" ? "persons" : "companies"} found
                      </p>
                    ) : (
                      existingEntities.map((entity) => {
                        const entityId = entity._id || entity.id;
                        const isSelected = selectedExistingEntities.some((e) => e.id === entityId);
                        const selectedEntity = selectedExistingEntities.find((e) => e.id === entityId);
                        const isExpanded = expandedEntities.has(entityId);

                        return (
                          <div key={entityId} className="space-y-2">
                            <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleExistingEntityToggle(entity)}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{entity.name}</p>
                                {entityType === "company" && entity.registrationNumber && (
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
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>

                            {isSelected && isExpanded && selectedEntity && (
                              <Card className="ml-8 mb-2">
                                <CardContent className="p-4">
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
                onClick={addNewEntityForm}
                className="rounded-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add More Entity
              </Button>
            </div>

            <div className={`grid gap-4 ${newEntities.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {newEntities.map((entity, entityIndex) => (
                <Card key={entityIndex} className="border-2 min-w-[300px]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">
                        {entityType === "person" ? "Person" : "Company"} #{entityIndex + 1}
                      </h4>
                      {newEntities.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewEntityForm(entityIndex)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <Label>
                          Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder={`Enter ${entityType} name`}
                          value={entity.name}
                          onChange={(e) =>
                            handleNewEntityChange(entityIndex, "name", e.target.value)
                          }
                          className="rounded-lg"
                        />
                      </div>

                      {/* Person-specific fields */}
                      {entityType === "person" && (
                        <>
                          <div>
                            <Label>
                              Nationality <span className="text-red-500">*</span>
                            </Label>
                            <Select
                              value={entity.nationality}
                              onValueChange={(value) =>
                                handleNewEntityChange(entityIndex, "nationality", value)
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
                          <div>
                            <Label>
                              Email (Optional)
                            </Label>
                            <Input
                              type="email"
                              placeholder="Enter email"
                              value={entity.email || ""}
                              onChange={(e) =>
                                handleNewEntityChange(entityIndex, "email", e.target.value)
                              }
                              className="rounded-lg"
                            />
                          </div>
                          <div>
                            <Label>
                              Phone Number (Optional)
                            </Label>
                            <Input
                              type="tel"
                              placeholder="Enter phone number"
                              value={entity.phoneNumber || ""}
                              onChange={(e) =>
                                handleNewEntityChange(entityIndex, "phoneNumber", e.target.value)
                              }
                              className="rounded-lg"
                            />
                          </div>
                        </>
                      )}

                      {/* Company-specific fields */}
                      {entityType === "company" && (
                        <>
                          <div>
                            <Label>
                              Registration Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder="Enter registration number"
                              value={entity.registrationNumber || ""}
                              onChange={(e) =>
                                handleNewEntityChange(entityIndex, "registrationNumber", e.target.value)
                              }
                              className="rounded-lg"
                            />
                          </div>
                          <div>
                            <ShareClassInput
                              values={entity.shareClassValues || getDefaultShareClassValues()}
                              errors={getDefaultShareClassErrors()}
                              useClassShares={entity.useClassShares || false}
                              visibleShareClasses={entity.visibleShareClasses || []}
                              onValuesChange={(values) => {
                                setNewEntities((prev) =>
                                  prev.map((e, i) =>
                                    i === entityIndex ? { ...e, shareClassValues: values } : e
                                  )
                                );
                              }}
                              onUseClassSharesChange={(useClassShares) => {
                                setNewEntities((prev) =>
                                  prev.map((e, i) =>
                                    i === entityIndex
                                      ? {
                                          ...e,
                                          useClassShares,
                                        }
                                      : e
                                  )
                                );
                              }}
                              onVisibleShareClassesChange={(visibleShareClasses) => {
                                setNewEntities((prev) =>
                                  prev.map((e, i) =>
                                    i === entityIndex ? { ...e, visibleShareClasses } : e
                                  )
                                );
                              }}
                              showTotal={true}
                              label="Total Shares (Optional)"
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label>Industry (Optional)</Label>
                            <Select
                              value={entity.industry || ""}
                              onValueChange={(value) => {
                              
                              handleNewEntityChange(entityIndex, "industry", value);

                              if (value !== "Other") {
                              handleNewEntityChange(entityIndex, "customIndustry", "");
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
                                  handleNewEntityChange(entityIndex, "customIndustry", e.target.value)
                                }
                                className="rounded-xl border-gray-200 mt-2"
                              />
                            )}
                          </div>
                          <div>
                            <Label>Company Summary (Optional)</Label>
                            <Textarea
                              placeholder="Enter company description"
                              value={entity.description || ""}
                              onChange={(e) =>
                                handleNewEntityChange(entityIndex, "description", e.target.value)
                              }
                              className="rounded-lg"
                            />
                          </div>
                          <div>
                            <Label>Start Date (Optional)</Label>
                            <Input
                              type="date"
                              value={entity.companyStartedAt || ""}
                              onChange={(e) =>
                                handleNewEntityChange(entityIndex, "companyStartedAt", e.target.value)
                              }
                              className="rounded-lg"
                            />
                          </div>
                        </>
                      )}

                      {/* Address */}
                      <div>
                        <Label>
                          Address <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          placeholder="Enter address"
                          value={entity.address}
                          onChange={(e) =>
                            handleNewEntityChange(entityIndex, "address", e.target.value)
                          }
                          className="rounded-lg"
                        />
                      </div>

                      {/* Shares Data */}
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
                                  
                                  handleNewEntityChange(entityIndex, "sharesData", updatedSharesData);
                                } else if (shareClass === "A" || shareClass === "B" || shareClass === "C") {
                                  // For A, B, C, use existing handler
                                  handleNewEntityClassSharesChange(
                                    entityIndex,
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
                      
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          )}
        </div>

        <div className={`${inline ? 'flex gap-3 mt-6' : 'mt-6'}`}>
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
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
              "Submit Added Shareholder"
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

