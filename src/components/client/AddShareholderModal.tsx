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
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Building2, Plus, X, ChevronDown, ChevronUp, Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
}

interface ExistingEntity {
  id: string;
  name: string;
  type: "person" | "company";
  sharesData: ShareDataItem[];
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
  totalShares?: number;
  industry?: string;
  description?: string;
  companyStartedAt?: string;
  // Common
  sharesData: ShareDataItem[];
}

const SHARE_CLASSES = ["A", "B", "C"];

export const AddShareholderModal: React.FC<AddShareholderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  companyId,
  entityType,
  companyTotalShares = 0,
  existingSharesTotal = 0,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [existingEntities, setExistingEntities] = useState<any[]>([]);
  const [selectedExistingEntities, setSelectedExistingEntities] = useState<ExistingEntity[]>([]);
  const [newEntities, setNewEntities] = useState<NewEntityForm[]>([
    {
      name: "",
      nationality: "",
      address: "",
      sharesData: [{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }],
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nationalityOptions, setNationalityOptions] = useState<
    { value: string; label: string; isEuropean: boolean }[]
  >([]);
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [shareValidationErrors, setShareValidationErrors] = useState<Record<string, string>>({});
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  
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

  // Fetch nationality options
  useEffect(() => {
    const fetchNationalities = async () => {
      try {
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,region");
        const data = await response.json();
        const nationalities = data
          .map((country: any) => ({
            value: country.name.common,
            label: country.name.common,
            isEuropean: country.region === "Europe",
          }))
          .sort((a: any, b: any) => {
            if (a.isEuropean && !b.isEuropean) return -1;
            if (!a.isEuropean && b.isEuropean) return 1;
            return a.label.localeCompare(b.label);
          });
        setNationalityOptions(nationalities);
      } catch (error) {
        console.error("Error fetching nationalities:", error);
      }
    };
    fetchNationalities();
  }, []);

  // Validate shares and update error state
  const validateShares = useCallback(() => {
    const totalShares = companyTotalShares || 0;
    
    // Calculate occupied shares from current company
    let occupiedShares = 0;
    if (currentCompany) {
      // Sum from shareHolders (persons)
      if (Array.isArray(currentCompany.shareHolders)) {
        currentCompany.shareHolders.forEach((sh: any) => {
          if (Array.isArray(sh.sharesData)) {
            sh.sharesData.forEach((sd: any) => {
              occupiedShares += Number(sd.totalShares) || 0;
            });
          }
        });
      }
      
      // Sum from shareHoldingCompanies
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
    
    // Calculate form shares (from selected existing + new entities)
    let formShares = 0;
    
    // Sum from selected existing entities
    selectedExistingEntities.forEach((entity) => {
      entity.sharesData.forEach((sd) => {
        formShares += Number(sd.totalShares) || 0;
      });
    });
    
    // Sum from new entities
    newEntities.forEach((entity) => {
      entity.sharesData.forEach((sd) => {
        formShares += Number(sd.totalShares) || 0;
      });
    });
    
    const remainingShares = totalShares - occupiedShares;
    const totalAfterForm = occupiedShares + formShares;
    
    const errors: Record<string, string> = {};
    
    // Check if total exceeds remaining
    if (totalAfterForm > totalShares) {
      const exceeded = totalAfterForm - totalShares;
      errors.global = `Total shares exceed available shares by ${exceeded.toLocaleString()}. Remaining: ${remainingShares.toLocaleString()}`;
    }
    
    setShareValidationErrors(errors);
    
    return Object.keys(errors).length === 0;
  }, [selectedExistingEntities, newEntities, currentCompany, companyTotalShares]);

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

  const handleExistingEntitySharesDataChange = (
    entityId: string,
    index: number,
    field: "totalShares" | "shareClass",
    value: number | string
  ) => {
    setSelectedExistingEntities(
      selectedExistingEntities.map((entity) => {
        if (entity.id === entityId) {
          const updatedSharesData = [...entity.sharesData];
          updatedSharesData[index] = {
            ...updatedSharesData[index],
            [field]: value,
            shareType: "Ordinary", // Always Ordinary
          };
          return { ...entity, sharesData: updatedSharesData };
        }
        return entity;
      })
    );
    
    // Validate after change
    setTimeout(() => validateShares(), 0);
  };

  const addExistingEntitySharesData = (entityId: string) => {
    setSelectedExistingEntities(
      selectedExistingEntities.map((entity) => {
        if (entity.id === entityId) {
          return {
            ...entity,
            sharesData: [
              ...entity.sharesData,
              { totalShares: 0, shareClass: "A", shareType: "Ordinary" },
            ],
          };
        }
        return entity;
      })
    );
    setTimeout(() => validateShares(), 0);
  };

  const removeExistingEntitySharesData = (entityId: string, index: number) => {
    setSelectedExistingEntities(
      selectedExistingEntities.map((entity) => {
        if (entity.id === entityId) {
          const updatedSharesData = entity.sharesData.filter((_, i) => i !== index);
          return {
            ...entity,
            sharesData: updatedSharesData.length > 0 ? updatedSharesData : [{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }],
          };
        }
        return entity;
      })
    );
    setTimeout(() => validateShares(), 0);
  };

  const handleNewEntityChange = (index: number, field: keyof NewEntityForm, value: any) => {
    setNewEntities(
      newEntities.map((entity, i) => {
        if (i === index) {
          return { ...entity, [field]: value };
        }
        return entity;
      })
    );
  };

  const handleNewEntitySharesDataChange = (
    entityIndex: number,
    sharesIndex: number,
    field: "totalShares" | "shareClass",
    value: number | string
  ) => {
    setNewEntities(
      newEntities.map((entity, i) => {
        if (i === entityIndex) {
          const updatedSharesData = [...entity.sharesData];
          updatedSharesData[sharesIndex] = {
            ...updatedSharesData[sharesIndex],
            [field]: value,
            shareType: "Ordinary", // Always Ordinary
          };
          return { ...entity, sharesData: updatedSharesData };
        }
        return entity;
      })
    );
    
    // Validate after change
    setTimeout(() => validateShares(), 0);
  };

  const addNewEntitySharesData = (entityIndex: number) => {
    setNewEntities(
      newEntities.map((entity, i) => {
        if (i === entityIndex) {
          return {
            ...entity,
            sharesData: [
              ...entity.sharesData,
              { totalShares: 0, shareClass: "A", shareType: "Ordinary" },
            ],
          };
        }
        return entity;
      })
    );
    setTimeout(() => validateShares(), 0);
  };

  const removeNewEntitySharesData = (entityIndex: number, sharesIndex: number) => {
    setNewEntities(
      newEntities.map((entity, i) => {
        if (i === entityIndex) {
          const updatedSharesData = entity.sharesData.filter((_, idx) => idx !== sharesIndex);
          return {
            ...entity,
            sharesData: updatedSharesData.length > 0 ? updatedSharesData : [{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }],
          };
        }
        return entity;
      })
    );
    setTimeout(() => validateShares(), 0);
  };

  const addNewEntityForm = () => {
    setNewEntities([
      ...newEntities,
      {
        name: "",
        nationality: "",
        address: "",
        sharesData: [{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }],
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
                await addShareHolderCompanyNew(clientId, companyId, {
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
            const companyResponse = await fetch(
              `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company`,
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
                  totalShares: entity.totalShares || 100, // Default to 100
                  industry: entity.industry,
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
        sharesData: [{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }],
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">
            Add {entityType === "person" ? "Person" : "Company"} Shareholder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Select Existing Entity Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Select Existing {entityType === "person" ? "Person" : "Company"}
              </h3>
              {!isGlobalSearchMode && (
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

            {isGlobalSearchMode ? (
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
                      placeholder={`Search ${entityType === "person" ? "persons" : "companies"} globally...`}
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
                              {entityType === "company" && entity.registrationNumber && (
                                <p className="text-sm text-gray-500">
                                  {entity.registrationNumber}
                                </p>
                              )}
                              {entityType === "person" && entity.email && (
                                <p className="text-sm text-gray-500">{entity.email}</p>
                              )}
                              {entityType === "person" && entity.nationality && (
                                <p className="text-xs text-gray-400">{entity.nationality}</p>
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
                                    Enter Shares (at least one required)
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
                                  {selectedEntity.sharesData.map((shareData, index) => {
                                    const hasError = shareValidationErrors.global ? true : false;
                                    return (
                                      <div key={index} className="flex gap-3 items-end">
                                        <div className="flex-1">
                                          <Label className="text-xs text-gray-600">Total Shares</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            step="1"
                                            placeholder="0"
                                            value={shareData.totalShares || ""}
                                            onChange={(e) =>
                                              handleExistingEntitySharesDataChange(
                                                entityId,
                                                index,
                                                "totalShares",
                                                Number(e.target.value) || 0
                                              )
                                            }
                                            className={`rounded-lg ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                          />
                                          {hasError && (
                                            <p className="text-xs text-red-600 mt-1">
                                              {shareValidationErrors.global}
                                            </p>
                                          )}
                                        </div>
                                        <div className="w-32">
                                          <Label className="text-xs text-gray-600">Class</Label>
                                          <Select
                                            value={shareData.shareClass}
                                            onValueChange={(value) =>
                                              handleExistingEntitySharesDataChange(
                                                entityId,
                                                index,
                                                "shareClass",
                                                value
                                              )
                                            }
                                          >
                                            <SelectTrigger className="rounded-lg">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {SHARE_CLASSES.map((cls) => (
                                                <SelectItem key={cls} value={cls}>
                                                  {cls}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        {selectedEntity.sharesData.length > 1 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeExistingEntitySharesData(entityId, index)}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    );
                                  })}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addExistingEntitySharesData(entityId)}
                                    className="w-full rounded-lg"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add More Shares
                                  </Button>
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
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
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
                                      Enter Shares (at least one required)
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
                                    {selectedEntity.sharesData.map((shareData, index) => {
                                      const hasError = shareValidationErrors.global ? true : false;
                                      return (
                                        <div key={index} className="flex gap-3 items-end">
                                          <div className="flex-1">
                                            <Label className="text-xs text-gray-600">Total Shares</Label>
                                            <Input
                                              type="number"
                                              min="0"
                                              step="1"
                                              placeholder="0"
                                              value={shareData.totalShares || ""}
                                              onChange={(e) =>
                                                handleExistingEntitySharesDataChange(
                                                  entityId,
                                                  index,
                                                  "totalShares",
                                                  Number(e.target.value) || 0
                                                )
                                              }
                                              className={`rounded-lg ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                            />
                                            {hasError && (
                                              <p className="text-xs text-red-600 mt-1">
                                                {shareValidationErrors.global}
                                              </p>
                                            )}
                                          </div>
                                          <div className="w-32">
                                            <Label className="text-xs text-gray-600">Class</Label>
                                            <Select
                                              value={shareData.shareClass}
                                              onValueChange={(value) =>
                                                handleExistingEntitySharesDataChange(
                                                  entityId,
                                                  index,
                                                  "shareClass",
                                                  value
                                                )
                                              }
                                            >
                                              <SelectTrigger className="rounded-lg">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {SHARE_CLASSES.map((cls) => (
                                                  <SelectItem key={cls} value={cls}>
                                                    {cls}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          {selectedEntity.sharesData.length > 1 && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeExistingEntitySharesData(entityId, index)}
                                              className="text-red-600 hover:text-red-700"
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      );
                                    })}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addExistingEntitySharesData(entityId)}
                                      className="w-full rounded-lg"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add More Shares
                                    </Button>
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

          {/* Create New Entity Section */}
          <div className="space-y-4 border-t pt-6">
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

            <div className="space-y-6">
              {newEntities.map((entity, entityIndex) => (
                <Card key={entityIndex} className="border-2">
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
                              <SelectTrigger className="rounded-lg">
                                <SelectValue placeholder="Select nationality" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {nationalityOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
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
                            <Label>Total Shares (Optional)</Label>
                            <Input
                              type="number"
                              min="100"
                              placeholder="100"
                              value={entity.totalShares || ""}
                              onChange={(e) =>
                                handleNewEntityChange(entityIndex, "totalShares", Number(e.target.value) || undefined)
                              }
                              className="rounded-lg"
                            />
                          </div>
                          <div>
                            <Label>Industry (Optional)</Label>
                            <Input
                              placeholder="Enter industry"
                              value={entity.industry || ""}
                              onChange={(e) =>
                                handleNewEntityChange(entityIndex, "industry", e.target.value)
                              }
                              className="rounded-lg"
                            />
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
                            Shares (at least one required)
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
                          {entity.sharesData.map((shareData, sharesIndex) => {
                            const hasError = shareValidationErrors.global ? true : false;
                            return (
                              <div key={sharesIndex} className="flex gap-3 items-end">
                                <div className="flex-1">
                                  <Label className="text-xs text-gray-600">Total Shares</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={shareData.totalShares || ""}
                                    onChange={(e) =>
                                      handleNewEntitySharesDataChange(
                                        entityIndex,
                                        sharesIndex,
                                        "totalShares",
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className={`rounded-lg ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                                  />
                                  {hasError && (
                                    <p className="text-xs text-red-600 mt-1">
                                      {shareValidationErrors.global}
                                    </p>
                                  )}
                                </div>
                                <div className="w-32">
                                  <Label className="text-xs text-gray-600">Class</Label>
                                  <Select
                                    value={shareData.shareClass}
                                    onValueChange={(value) =>
                                      handleNewEntitySharesDataChange(
                                        entityIndex,
                                        sharesIndex,
                                        "shareClass",
                                        value
                                      )
                                    }
                                  >
                                    <SelectTrigger className="rounded-lg">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SHARE_CLASSES.map((cls) => (
                                        <SelectItem key={cls} value={cls}>
                                          {cls}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {entity.sharesData.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeNewEntitySharesData(entityIndex, sharesIndex)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addNewEntitySharesData(entityIndex)}
                            className="w-full rounded-lg"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add More Shares
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

