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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Building2, Plus, X, Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanies, searchCompaniesGlobal, searchPersonsGlobal } from "@/lib/api/company";
import {
  addShareHolderPersonNew,
  addShareHolderPersonNewBulk,
  updateShareHolderPersonExisting,
  updateShareHolderPersonExistingBulk,
  addShareHolderCompanyNew,
  addShareHolderCompanyNewBulk,
  updateShareHolderCompanyExisting,
  updateShareHolderCompanyExistingBulk,
  addRepresentationPersonNew,
  addRepresentationPersonNewBulk,
  updateRepresentationPersonExisting,
  updateRepresentationPersonExistingBulk,
  addRepresentationCompanyNew,
  addRepresentationCompanyNewBulk,
  updateRepresentationCompanyExisting,
  updateRepresentationCompanyExistingBulk,
  type ShareDataItem,
} from "@/lib/api/company";
import { CreatePersonModal } from "./CreatePersonModal";
import { CreateCompanyModal } from "./CreateCompanyModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddShareholderRepresentativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  companyId: string;
  mode: "shareholder" | "representative";
  companyTotalShares?: number;
  existingSharesTotal?: number;
  company?: any;
}

interface Person {
  _id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  nationality?: string;
  address?: string;
}

interface Company {
  _id: string;
  name: string;
  registrationNumber?: string;
  address?: string;
}

export const AddShareholderRepresentativeModal: React.FC<
  AddShareholderRepresentativeModalProps
> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  companyId,
  mode,
  companyTotalShares = 0,
  existingSharesTotal = 0,
  company,
}) => {
  const [activeTab, setActiveTab] = useState<
    "existing-person" | "new-person" | "existing-company" | "new-company"
  >("existing-person");
  const [isLoading, setIsLoading] = useState(false);
  const [persons, setPersons] = useState<Person[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [sharesData, setSharesData] = useState<ShareDataItem[]>([
    { totalShares: 0, shareClass: "A", shareType: "Ordinary" },
  ]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatePersonModalOpen, setIsCreatePersonModalOpen] = useState(false);
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  
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

  const ROLES = [
    "Shareholder",
    "Director",
    "Judicial Representative",
    "Legal Representative",
    "Secretary",
  ];

  // Fetch all persons for the company (persons are scoped to company in the API)
  const fetchAllPersons = async () => {
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
      setPersons(result.data || []);
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

  // Fetch all companies for the client
  const fetchAllCompanies = async () => {
    try {
      setIsLoading(true);
      const result = await fetchCompanies(clientId);
      // Filter out the current company from the list
      setCompanies((result.data || []).filter((c: any) => c._id !== companyId && c.id !== companyId));
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Global search is now default, so we don't fetch all entities upfront
    if (isOpen) {
      // Clear previous search state when opening/switching tabs if desired
      // setSearchQuery("");
      // setSearchResults([]);
    }
  }, [isOpen, activeTab]);

  const handlePersonToggle = (personId: string) => {
    if (isBulkMode) {
      setSelectedPersonIds((prev) =>
        prev.includes(personId)
          ? prev.filter((id) => id !== personId)
          : [...prev, personId]
      );
    } else {
      setSelectedPersonIds([personId]);
    }
  };

  const handleCompanyToggle = (companyId: string) => {
    if (isBulkMode) {
      setSelectedCompanyIds((prev) =>
        prev.includes(companyId)
          ? prev.filter((id) => id !== companyId)
          : [...prev, companyId]
      );
    } else {
      setSelectedCompanyIds([companyId]);
    }
  };

  const addShareDataRow = () => {
    setSharesData([
      ...sharesData,
      { totalShares: 0, shareClass: "A", shareType: "Ordinary" },
    ]);
  };

  const removeShareDataRow = (index: number) => {
    setSharesData(sharesData.filter((_, i) => i !== index));
  };

  const updateShareData = (
    index: number,
    field: keyof ShareDataItem,
    value: any
  ) => {
    const updated = [...sharesData];
    updated[index] = { ...updated[index], [field]: value };
    setSharesData(updated);
  };

  const handleRoleToggle = (role: string) => {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async () => {
    if (activeTab === "existing-person") {
      if (selectedPersonIds.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one person",
          variant: "destructive",
        });
        return;
      }
      if (mode === "shareholder") {
        if (sharesData.length === 0 || sharesData.some((s) => s.totalShares <= 0)) {
          toast({
            title: "Error",
            description: "Please provide valid shares data",
            variant: "destructive",
          });
          return;
        }
      }
    } else if (activeTab === "existing-company") {
      if (selectedCompanyIds.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one company",
          variant: "destructive",
        });
        return;
      }
      if (mode === "shareholder") {
        if (sharesData.length === 0 || sharesData.some((s) => s.totalShares <= 0)) {
          toast({
            title: "Error",
            description: "Please provide valid shares data",
            variant: "destructive",
          });
          return;
        }
      }
    } else if (activeTab === "new-person") {
      setIsCreatePersonModalOpen(true);
      return;
    } else if (activeTab === "new-company") {
      setIsCreateCompanyModalOpen(true);
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "shareholder") {
        if (activeTab === "existing-person") {
          if (isBulkMode || selectedPersonIds.length > 1) {
            // Bulk update existing
            await updateShareHolderPersonExistingBulk(clientId, companyId, {
              personIds: selectedPersonIds,
            });
          } else {
            // Single update existing
            await updateShareHolderPersonExisting(
              clientId,
              companyId,
              selectedPersonIds[0],
              { sharesData }
            );
          }
        } else if (activeTab === "existing-company") {
          if (isBulkMode || selectedCompanyIds.length > 1) {
            // Bulk update existing
            await updateShareHolderCompanyExistingBulk(clientId, companyId, {
              companyIds: selectedCompanyIds,
            });
          } else {
            // Single update existing
            await updateShareHolderCompanyExisting(
              clientId,
              companyId,
              selectedCompanyIds[0],
              { sharesData }
            );
          }
        }
      } else {
        // Representative mode
        if (roles.length === 0) {
          toast({
            title: "Error",
            description: "Please select at least one role",
            variant: "destructive",
          });
          return;
        }

        if (activeTab === "existing-person") {
          if (isBulkMode || selectedPersonIds.length > 1) {
            // Bulk update existing
            await updateRepresentationPersonExistingBulk(clientId, companyId, {
              personIds: selectedPersonIds,
            });
          } else {
            // Single update existing
            await updateRepresentationPersonExisting(
              clientId,
              companyId,
              selectedPersonIds[0],
              { role: roles }
            );
          }
        } else if (activeTab === "existing-company") {
          if (isBulkMode || selectedCompanyIds.length > 1) {
            // Bulk update existing
            await updateRepresentationCompanyExistingBulk(clientId, companyId, {
              companyIds: selectedCompanyIds,
            });
          } else {
            // Single update existing
            await updateRepresentationCompanyExisting(
              clientId,
              companyId,
              selectedCompanyIds[0],
              { role: roles }
            );
          }
        }
      }

      toast({
        title: "Success",
        description: `Successfully added ${mode === "shareholder" ? "shareholder" : "representative"}`,
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error submitting:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to submit",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPersonIds([]);
    setSelectedCompanyIds([]);
    setSharesData([{ totalShares: 0, shareClass: "A", shareType: "Ordinary" }]);
    setRoles([]);
    setIsBulkMode(false);
    setActiveTab("existing-person");
    onClose();
  };

  const handleCreatePersonSuccess = () => {
    setIsCreatePersonModalOpen(false);
    fetchAllPersons();
    onSuccess();
    handleClose();
  };

  const handleCreateCompanySuccess = () => {
    setIsCreateCompanyModalOpen(false);
    fetchAllCompanies();
    onSuccess();
    handleClose();
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
      const entityType = activeTab === "existing-person" || activeTab === "new-person" ? "person" : "company";
      const currentPage = pageOverride !== undefined ? pageOverride : searchPagination.page;
      
      if (entityType === "person") {
        const result = await searchPersonsGlobal({
          search: searchQuery.trim(),
          page: currentPage,
          limit: searchPagination.limit,
        });
        
        // Filter out existing representatives
        let data = result.data || [];
        if (company) {
          data = data.filter((person: any) => {
             // Check if person is already a representative
             const isRepresentative = (company.representationalSchema || []).some((rep: any) => {
                const repId = typeof rep.personId === 'object' ? rep.personId?._id : rep.personId;
                return repId === person._id;
             });
             // Also check if they are a shareholder? User request: "if a company is already added as a shareholder or a representative"
             // Assuming this applies to Persons as well properly if they are already in the list
             return !isRepresentative;
          });
        }

        setSearchResults(data);
        setSearchPagination(result.pagination || searchPagination);
      } else {
        const result = await searchCompaniesGlobal({
          search: searchQuery.trim(),
          page: currentPage,
          limit: searchPagination.limit,
        });
        
        // Filter out existing companies that are already shareholders or representatives
        let data = result.data || [];
        if (company) {
          data = data.filter((comp: any) => {
            // Check if company is already a shareholding company
            const isShareholder = (company.shareHoldingCompanies || []).some((sh: any) => {
               const shId = typeof sh.companyId === 'object' ? sh.companyId?._id : sh.companyId;
               return shId === comp._id;
            });
            
            // Check if company is already a representative company
            const isRepresentativeInfo = (company.representationalCompany || []).some((rep: any) => {
                const repId = typeof rep.companyId === 'object' ? rep.companyId?._id : rep.companyId;
                return repId === comp._id;
             });

            return !isShareholder && !isRepresentativeInfo;
          });
        }

        setSearchResults(data);
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Add {mode === "shareholder" ? "Shareholder" : "Representative"}
            </DialogTitle>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(
                value as
                  | "existing-person"
                  | "new-person"
                  | "existing-company"
                  | "new-company"
              )
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="existing-person" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Existing Person
              </TabsTrigger>
              <TabsTrigger value="new-person" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Person
              </TabsTrigger>
              <TabsTrigger
                value="existing-company"
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                Existing Company
              </TabsTrigger>
              <TabsTrigger value="new-company" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Company
              </TabsTrigger>
            </TabsList>

            {/* Existing Person Tab */}
            <TabsContent value="existing-person" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Search persons globally..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleGlobalSearch();
                      }
                    }}
                  />
                  <Button
                    onClick={() => handleGlobalSearch()}
                    disabled={isSearching || !searchQuery.trim()}
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
                  {searchResults.map((person) => (
                    <div
                      key={person._id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                    >
                      <Checkbox
                        checked={selectedPersonIds.includes(person._id)}
                        onCheckedChange={() => handlePersonToggle(person._id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{person.name}</p>
                        {person.email && (
                          <p className="text-sm text-gray-500">{person.email}</p>
                        )}
                        {person.nationality && (
                          <p className="text-xs text-gray-400">{person.nationality}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {searchPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                          handleGlobalSearch();
                        }}
                        disabled={searchPagination.page === 1}
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

              {mode === "shareholder" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Shares Data</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addShareDataRow}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Row
                    </Button>
                  </div>
                  {sharesData.map((share, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Total Shares</Label>
                        <Input
                          type="number"
                          value={share.totalShares || ""}
                          onChange={(e) =>
                            updateShareData(
                              index,
                              "totalShares",
                              parseInt(e.target.value) || 0
                            )
                          }
                          min="0"
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Class</Label>
                        <Select
                          value={share.shareClass}
                          onValueChange={(value) =>
                            updateShareData(index, "shareClass", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label>Type</Label>
                        <Select
                          value={share.shareType || "Ordinary"}
                          onValueChange={(value) =>
                            updateShareData(index, "shareType", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ordinary">Ordinary</SelectItem>
                            <SelectItem value="Preferred">Preferred</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {sharesData.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeShareDataRow(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {mode === "representative" && (
                <div className="space-y-2">
                  <Label>Roles</Label>
                  {ROLES.map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        checked={roles.includes(role)}
                        onCheckedChange={() => handleRoleToggle(role)}
                      />
                      <Label className="font-normal">{role}</Label>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* New Person Tab */}
            <TabsContent value="new-person" className="space-y-4 mt-4">
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  Create a new person and add them as{" "}
                  {mode === "shareholder" ? "shareholder" : "representative"}
                </p>
                <Button onClick={() => setIsCreatePersonModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Person
                </Button>
              </div>
            </TabsContent>

            {/* Existing Company Tab */}
            <TabsContent value="existing-company" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
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
                  />
                  <Button
                    onClick={() => handleGlobalSearch()}
                    disabled={isSearching || !searchQuery.trim()}
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
                  {searchResults.map((company) => (
                    <div
                      key={company._id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                    >
                      <Checkbox
                        checked={selectedCompanyIds.includes(company._id)}
                        onCheckedChange={() => handleCompanyToggle(company._id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{company.name}</p>
                        {company.registrationNumber && (
                          <p className="text-sm text-gray-500">
                            {company.registrationNumber}
                          </p>
                        )}
                        {company.address && (
                          <p className="text-xs text-gray-400">{company.address}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {searchPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                          handleGlobalSearch();
                        }}
                        disabled={searchPagination.page === 1}
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

              {mode === "shareholder" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Shares Data</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addShareDataRow}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Row
                    </Button>
                  </div>
                  {sharesData.map((share, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Total Shares</Label>
                        <Input
                          type="number"
                          value={share.totalShares || ""}
                          onChange={(e) =>
                            updateShareData(
                              index,
                              "totalShares",
                              parseInt(e.target.value) || 0
                            )
                          }
                          min="0"
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Class</Label>
                        <Select
                          value={share.shareClass}
                          onValueChange={(value) =>
                            updateShareData(index, "shareClass", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label>Type</Label>
                        <Select
                          value={share.shareType || "Ordinary"}
                          onValueChange={(value) =>
                            updateShareData(index, "shareType", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ordinary">Ordinary</SelectItem>
                            <SelectItem value="Preferred">Preferred</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {sharesData.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeShareDataRow(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {mode === "representative" && (
                <div className="space-y-2">
                  <Label>Roles</Label>
                  {ROLES.map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        checked={roles.includes(role)}
                        onCheckedChange={() => handleRoleToggle(role)}
                      />
                      <Label className="font-normal">{role}</Label>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* New Company Tab */}
            <TabsContent value="new-company" className="space-y-4 mt-4">
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  Create a new company and add them as{" "}
                  {mode === "shareholder" ? "shareholder" : "representative"}
                </p>
                <Button onClick={() => setIsCreateCompanyModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Company
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {(activeTab === "existing-person" ||
              activeTab === "existing-company") && (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Person Modal */}
      {isCreatePersonModalOpen && (
        <CreatePersonModal
          isOpen={isCreatePersonModalOpen}
          onClose={() => setIsCreatePersonModalOpen(false)}
          onSuccess={handleCreatePersonSuccess}
          clientId={clientId}
          companyId={companyId}
          existingShareTotal={0}
          companyTotalShares={companyTotalShares}
          existingSharesTotal={existingSharesTotal}
        />
      )}

      {/* Create Company Modal */}
      {isCreateCompanyModalOpen && (
        <CreateCompanyModal
          isOpen={isCreateCompanyModalOpen}
          onClose={() => setIsCreateCompanyModalOpen(false)}
          onSuccess={handleCreateCompanySuccess}
          clientId={clientId}
        />
      )}
    </>
  );
};

