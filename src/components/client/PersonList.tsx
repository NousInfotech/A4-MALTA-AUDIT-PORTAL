import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Plus, Edit, Trash2, Mail, Phone, Globe, Building2, ChevronDown, X, UserCheck, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreatePersonModal } from "./CreatePersonModal";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { EditPersonModal } from "./EditPersonModal";
import { DeletePersonConfirmation } from "./DeletePersonConfirmation";
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
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompanyCreateModalOpen, setIsCompanyCreateModalOpen] = useState(false);
  const [isAddCompanyDropdownOpen, setIsAddCompanyDropdownOpen] = useState(false);
  const [existingCompanies, setExistingCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [sharePercentage, setSharePercentage] = useState<string>("");
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [shareError, setShareError] = useState<string>("");
  const { toast } = useToast();
  // API helper import usage (may be used for future actions)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        window.dispatchEvent(new CustomEvent('persons-updated', { detail: next }));
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
      // Filter out the current company from the list
      const filtered = (result.data || []).filter((c: any) => c._id !== companyId);
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

  const handleDeleteClick = (person: Person) => {
    setPersonToDelete(person);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!personToDelete) return;

    try {
      setIsDeleting(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyId}/person/${personToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete person");

      toast({
        title: "Success",
        description: "Person deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      setPersonToDelete(null);
      fetchPersons();
      try {
        const next = persons.filter(p => p._id !== personToDelete._id);
        window.dispatchEvent(new CustomEvent('persons-updated', { detail: next }));
      } catch (_) {}
      onUpdate();
    } catch (error) {
      console.error("Error deleting person:", error);
      toast({
        title: "Error",
        description: "Failed to delete person",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPerson = (person: Person) => {
    setSelectedPerson(person);
    setIsEditModalOpen(true);
  };

  // Helper function to calculate share totals and validate
  const calculateShareValidation = (selectedId: string, sharePct: number) => {
    // Calculate total person shares
    const currentPersonTotal = persons.reduce((acc, p) => {
      const pct = typeof p?.sharePercentage === "number" ? p.sharePercentage : 0;
      return acc + pct;
    }, 0);

    // Calculate total company shares, excluding the one being updated
    const currentShareholdings = company?.shareHoldingCompanies || [];
    const existingIndex = currentShareholdings.findIndex(
      (s: any) => {
        if (!s || !s.companyId) return false;
        const shareCompanyId = typeof s.companyId === 'string' ? s.companyId : s.companyId._id;
        return shareCompanyId === selectedId;
      }
    );

    // Sum all company shares except the one being updated (if it exists)
    let currentCompanyTotal = 0;
    currentShareholdings.forEach((share: any, idx: number) => {
      // Skip the shareholding being updated
      if (existingIndex >= 0 && idx === existingIndex) {
        return;
      }
      // Handle both old format (sharePercentage) and new format (sharesData.percentage)
      const sharePct = share?.sharesData?.percentage ?? share?.sharePercentage;
      const numPct = typeof sharePct === "number" ? sharePct : 0;
      if (!isNaN(numPct) && numPct > 0) {
        currentCompanyTotal += numPct;
      }
    });

    // Calculate what the new total would be
    const newTotal = currentPersonTotal + currentCompanyTotal + sharePct;
    const available = Math.max(0, 100 - (currentPersonTotal + currentCompanyTotal));

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
        // Update existing shareholding
        updatedShareholdings = [...currentShareholdings];
        updatedShareholdings[existingIndex] = {
          companyId: selectedCompanyId,
          sharePercentage: sharePct,
        };
      } else {
        // Add new shareholding
        updatedShareholdings = [
          ...currentShareholdings,
          {
            companyId: selectedCompanyId,
            sharePercentage: sharePct,
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

  const getRoleBadgeVariant = (role: string) => {
    if (role === "Shareholder") return "bg-blue-100 text-blue-700 border-blue-200";
    if (role === "Director") return "bg-green-100 text-green-700 border-green-200";
    if (role === "Judicial Representative") return "bg-amber-100 text-amber-700 border-amber-200";
    if (role === "Legal Representative") return "bg-red-100 text-red-700 border-red-200";
    if (role === "Secretary") return "bg-gray-100 text-gray-700 border-gray-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
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

  // Get representatives from company.representationalSchema directly
  // Representatives are persons with roles EXCEPT those who ONLY have "Shareholder" role
  // role is now an array of strings in the schema
  const representatives = (company?.representationalSchema || [])
    .map((rep: any) => {
      const personData = rep.personId || {};
      // role is already an array of strings
      const roles = Array.isArray(rep.role) ? rep.role : (rep.role ? [rep.role] : []);
      return {
        ...personData,
        roles: roles,
      };
    })
    .filter((person: any) => {
      // Include if person has roles other than just "Shareholder"
      const roles = person.roles || [];
      return roles.length > 0 && !(roles.length === 1 && roles[0] === "Shareholder");
    });

  // Get shareholders from company.shareHolders array directly (not from persons array)
  // Sort by totalShares (biggest first)
  const personShareholders = (company?.shareHolders || [])
    .map((shareHolder: any) => {
      const personData = shareHolder.personId || {};
      const sharesData = shareHolder.sharesData || {};
      return {
        ...personData,
        sharePercentage: sharesData.percentage || 0,
        totalShares: sharesData.totalShares || 0,
        shareClass: sharesData.class,
      };
    })
    .sort((a, b) => (b.totalShares || 0) - (a.totalShares || 0));

  // Check if a person is UBO (Ultimate Beneficial Owner)
  // UBO: Person's company holds shares in this company AND person holds position in this company
  // For now, we'll check if person has a role and there are shareholding companies
  // In a full implementation, we'd need to check if the person is a shareholder/director of the shareholding company
  const isUBO = (person: Person): { isUBO: boolean; companyName?: string } => {
    if (!person.roles || person.roles.length === 0) {
      return { isUBO: false };
    }

    // Check if there are shareholding companies
    const shareHoldingCompanies = company?.shareHoldingCompanies || [];
    if (shareHoldingCompanies.length === 0) {
      return { isUBO: false };
    }

    // For now, if person has a role and there are shareholding companies, 
    // we'll mark as potential UBO with the first shareholding company name
    // In production, you'd want to check if the person is actually associated with that company
    const firstShareholdingCompany = shareHoldingCompanies.find((share: any) => {
      return share.companyId && (
        (typeof share.companyId === 'object' && share.companyId.name) ||
        typeof share.companyId === 'string'
      );
    });

    if (firstShareholdingCompany) {
      const companyName = typeof firstShareholdingCompany.companyId === 'object' 
        ? firstShareholdingCompany.companyId.name 
        : "Shareholding Company";
      return { isUBO: true, companyName };
    }

    return { isUBO: false };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading persons...</div>
      </div>
    );
  }

  // Get shareholding companies data with proper structure
  // Sort by totalShares (biggest first)
  const shareholdingCompanies = (company?.shareHoldingCompanies || [])
    .map((share: any) => {
      const sharePercentage = share?.sharesData?.percentage ?? share?.sharePercentage;
      const totalShares = share?.sharesData?.totalShares ?? 0;
      const companyName = share.companyId?.name || share.companyId || "Unknown Company";
      return {
        companyId: typeof share.companyId === 'object' ? share.companyId._id : share.companyId,
        companyName,
        sharePercentage,
        totalShares,
        registrationNumber: share.companyId?.registrationNumber,
      };
    })
    .sort((a, b) => (b.totalShares || 0) - (a.totalShares || 0));

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
                      <Popover 
            open={isAddCompanyDropdownOpen} 
            onOpenChange={(open) => {
              setIsAddCompanyDropdownOpen(open);
              if (!open) {
                // Reset form when closing
                setSelectedCompanyId("");
                setSharePercentage("");
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
          <TabsContent value="representatives" className="space-y-4 mt-6">
            {representatives.length > 0 ? (
              <div className="space-y-4">
                {representatives.map((person) => {
                  const uboInfo = isUBO(person);
                  // roles is already an array, filter out "Shareholder" role
                  const rolesArray = Array.isArray(person.roles) 
                    ? person.roles.filter((r: string) => r !== "Shareholder")
                    : [];
                    
                  return (
                    <Card
                      key={person._id || person.id}
                      className="bg-white/80 border border-white/50 rounded-xl shadow-sm hover:bg-white/70 transition-all"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {person.name}
                              </h4>
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
                              onClick={() => handleDeleteClick(person)}
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
          <TabsContent value="shareholders" className="space-y-4 mt-6">
            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-900">Shareholders</h4>
              <p className="text-sm text-gray-600">
                Individuals and companies holding shares in this company
              </p>
            </div>
              
            {/* Person Shareholders */}
            {personShareholders.length > 0 && (
              <div className="space-y-4">
                {personShareholders.map((person: any) => {
                  const totalShares = person.totalShares || 0;
                  const sharePercentage = person.sharePercentage || 0;
                  const shareClass = person.shareClass || "General";
                  return (
                    <Card
                      key={person._id || person.id}
                      className="bg-white/80 border border-white/50 rounded-xl shadow-sm hover:bg-white/70 transition-all"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-lg font-semibold text-gray-900">
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
                              onClick={() => handleDeleteClick(person)}
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
            )}

            {/* Company Shareholders */}
            {shareholdingCompanies.length > 0 && (
              <div className="space-y-4">
                {shareholdingCompanies.map((share, index) => (
                  <Card
                    key={`company-shareholder-${index}`}
                    className="bg-white/80 border border-white/50 rounded-xl shadow-sm hover:bg-white/70 transition-all"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Building2 className="h-5 w-5 text-gray-600" />
                            <h4 className="text-lg font-semibold text-gray-900">
                              {share.companyName}
                            </h4>
                            <Badge
                              variant="outline"
                              className="bg-blue-100 text-blue-700 border-blue-200 rounded-xl px-3 py-1 text-sm font-semibold"
                            >
                              {share.totalShares.toLocaleString()} shares ({share.sharePercentage}%)
                            </Badge>
                          </div>
                          {share.registrationNumber && (
                            <div className="text-sm text-gray-600">
                              Registration: {share.registrationNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {personShareholders.length === 0 && shareholdingCompanies.length === 0 && (
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
    </>
  );
};

