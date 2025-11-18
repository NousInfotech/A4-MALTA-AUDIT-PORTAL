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
} from "@/lib/api/company";
import { fetchCompanies } from "@/lib/api/company";

interface AddRepresentativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  companyId: string;
  entityType: "person" | "company";
}

interface ExistingEntity {
  id: string;
  name: string;
  type: "person" | "company";
  roles: string[];
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
  entityType,
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
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nationalityOptions, setNationalityOptions] = useState<
    { value: string; label: string; isEuropean: boolean }[]
  >([]);
  
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
  }, [isOpen, entityType]);

  const fetchExistingEntities = async () => {
    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      // First, fetch the company to get existing representatives
      const companyResponse = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!companyResponse.ok) throw new Error("Failed to fetch company");
      const companyResult = await companyResponse.json();
      const company = companyResult.data || {};

      // Get IDs of existing representatives
      let existingRepresentativeIds = new Set<string>();
      
      if (entityType === "person") {
        // Get person IDs from representationalSchema
        const representationalSchema = company.representationalSchema || [];
        representationalSchema.forEach((rep: any) => {
          const personId = rep?.personId?._id || rep?.personId?.id || rep?.personId;
          if (personId) {
            existingRepresentativeIds.add(String(personId));
          }
        });
      } else {
        // Get company IDs from representationalCompany
        const representationalCompany = company.representationalCompany || [];
        representationalCompany.forEach((rep: any) => {
          const repCompanyId = rep?.companyId?._id || rep?.companyId?.id || rep?.companyId;
          if (repCompanyId) {
            existingRepresentativeIds.add(String(repCompanyId));
          }
        });
      }

      if (entityType === "person") {
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
        
        // Filter out persons that are already representatives
        const filteredPersons = allPersons.filter((person: any) => {
          const personId = person._id || person.id;
          return !existingRepresentativeIds.has(String(personId));
        });
        
        setExistingEntities(filteredPersons);
      } else {
        const result = await fetchCompanies(clientId);
        const allCompanies = result.data || [];
        
        // Filter out the current company and companies that are already representatives
        const filteredCompanies = allCompanies.filter((c: any) => {
          const cId = c._id || c.id;
          return cId !== companyId && !existingRepresentativeIds.has(String(cId));
        });
        
        setExistingEntities(filteredCompanies);
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
    } else {
      // Add new selection
      setSelectedExistingEntities([
        ...selectedExistingEntities,
        {
          id: entityId,
          name: entity.name,
          type: entityType,
          roles: [],
          expanded: true,
        },
      ]);
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
    setSelectedExistingEntities(
      selectedExistingEntities.map((entity) => {
        if (entity.id === entityId) {
          return { ...entity, expanded: !entity.expanded };
        }
        return entity;
      })
    );
  };

  const handleAddNewEntity = () => {
    setNewEntities([
      ...newEntities,
      {
        name: "",
        nationality: "",
        address: "",
        roles: [],
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
    setNewEntities(
      newEntities.map((entity, i) => {
        if (i === index) {
          return { ...entity, [field]: value };
        }
        return entity;
      })
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

  const validateForm = (): string | null => {
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
              { role: selectedExistingEntities[0].roles }
            );
          } else {
            // Bulk update - need to process individually since API might not support per-entity roles in bulk
            for (const entity of selectedExistingEntities) {
              await updateRepresentationPersonExisting(clientId, companyId, entity.id, {
                role: entity.roles,
              });
            }
          }
        } else {
          if (selectedExistingEntities.length === 1) {
            // Single update
            await updateRepresentationCompanyExisting(
              clientId,
              companyId,
              selectedExistingEntities[0].id,
              { role: selectedExistingEntities[0].roles }
            );
          } else {
            // Bulk update - need to process individually
            for (const entity of selectedExistingEntities) {
              await updateRepresentationCompanyExisting(clientId, companyId, entity.id, {
                role: entity.roles,
              });
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
            });
          } else {
            // First create the company
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
                  totalShares: entity.totalShares || undefined,
                  industry: entity.industry || undefined,
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
            await addRepresentationCompanyNew(clientId, companyId, {
              companyId: companyId_new,
              role: entity.roles,
            });
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
        roles: [],
      },
    ]);
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
            Add {entityType === "person" ? "Person" : "Company"} Representative
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
                                {selectedEntity?.expanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>

                          {isSelected && selectedEntity?.expanded && (
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
                                  {selectedEntity?.expanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>

                            {isSelected && selectedEntity?.expanded && (
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

          {/* Create New Entity Section */}
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
                Add More {entityType === "person" ? "Person" : "Company"}
              </Button>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto border rounded-lg p-4">
              {newEntities.map((entity, index) => (
                <Card key={index} className="relative">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Total Shares</Label>
                          <Input
                            type="number"
                            min="100"
                            placeholder="Enter total shares"
                            value={entity.totalShares || ""}
                            onChange={(e) =>
                              handleNewEntityChange(
                                index,
                                "totalShares",
                                e.target.value ? parseInt(e.target.value) : undefined
                              )
                            }
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Industry</Label>
                          <Input
                            placeholder="Enter industry"
                            value={entity.industry || ""}
                            onChange={(e) =>
                              handleNewEntityChange(index, "industry", e.target.value)
                            }
                            className="rounded-xl"
                          />
                        </div>
                      </div>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 mt-6">
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
            disabled={isSubmitting}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

