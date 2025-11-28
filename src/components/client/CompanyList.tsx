import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit, Trash2, Users, FileText, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { DeleteCompanyConfirmation } from "./DeleteCompanyConfirmation";
import { fetchCompanies, deleteCompany, updateCompany, updateCompanyClientId } from "@/lib/api/company";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface Person {
  _id: string;
  name: string;
  roles: string[];
  email?: string;
  phoneNumber?: string;
  sharePercentage?: number;
  nationality?: string;
}

interface Company {
  _id: string;
  name: string;
  registrationNumber?: string;
  address?: string;
  status: "active" | "record";
  shareHolders?: Person[];
  supportingDocuments?: string[];
  timelineStart?: string;
  timelineEnd?: string;
  shareHoldingCompanies?: Array<{
    companyId: {
      _id: string;
      name: string;
      registrationNumber?: string;
    } | string;
    sharePercentage: number;
  }>;
  representative?: Person | null;
  createdAt: string;
}

interface CompanyListProps {
  clientId: string;
}

export const CompanyList: React.FC<CompanyListProps> = ({ clientId }) => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ _id: string; name: string; registrationNumber: string }>>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCompany, setPendingCompany] = useState<{ _id: string; name: string; registrationNumber: string } | null>(null);
  const { toast } = useToast();

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const result = await fetchCompanies(clientId);
      setCompanies(result.data || []);
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
    if (clientId) {
      loadCompanies();
    }
  }, [clientId]);

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;

    try {
      setIsDeleting(true);
      await deleteCompany(clientId, companyToDelete._id);

      toast({
        title: "Success",
        description: "Company deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      setCompanyToDelete(null);
      loadCompanies();
    } catch (error) {
      console.error("Error deleting company:", error);
      toast({
        title: "Error",
        description: "Failed to delete company",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewDetails = (company: Company) => {
    navigate(`/employee/clients/${clientId}/company/${company._id}`);
  };

  // Search companies
  const searchCompanies = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoadingCompanies(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/company/search/global?search=${encodeURIComponent(searchTerm)}&isNonPrimary=true`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to search companies");

      const res = await response.json();
      if (res.success) {
        setSearchResults(res.data || []);
      }
    } catch (err) {
      console.error("Error searching companies:", err);
      toast({
        title: "Error",
        description: "Failed to search companies",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleCompanyClick = (company: { _id: string; name: string; registrationNumber: string }) => {
    setPendingCompany(company);
    setShowConfirmDialog(true);
  };

  const handleSelectCompany = async () => {
    if (!pendingCompany) return;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      // Create a new company record linked to this client with the selected company's details
      const response = await updateCompanyClientId(clientId, pendingCompany._id, {
        clientId: clientId,
      });

      toast({
        title: "Success",
        description: "Company added successfully",
      });

      setShowCompanyDialog(false);
      setShowConfirmDialog(false);
      setPendingCompany(null);
      setCompanySearch("");
      setSearchResults([]);
      setHasSearched(false);
      loadCompanies();
    } catch (err: any) {
      console.error("Error adding company:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add company",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading companies...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-hover rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Companies</h2>
              <p className="text-gray-600">
                Associated companies and ownership structures
              </p>
            </div>
          </div>
          {/* <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-hover hover:bg-brand-sidebar text-white border-0 shadow-lg hover:shadow-xl rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button> */}
        </div>

        {/* Companies Grid */}
        {companies.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {companies.map((company) => (
              <Card
                key={company._id}
                className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 hover:bg-white/70 transition-all"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-brand-hover rounded-xl flex items-center justify-center">
                        <Building2 className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">
                          {company.name}
                        </CardTitle>
                        {company.registrationNumber && (
                          <p className="text-sm text-gray-600 mt-1">
                            {company.registrationNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`rounded-xl px-3 py-1 text-sm font-semibold ${
                          company.status === "active"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {company.status}
                      </Badge>
                    </div> */}

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{company.shareHolders?.length || 0} Persons</span>
                    </div>

                    {company.shareHoldingCompanies &&
                      company.shareHoldingCompanies.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="h-4 w-4" />
                          <span>
                            {company.shareHoldingCompanies.length} Shareholding
                            Companies
                          </span>
                        </div>
                      )}

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(company);
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(company);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-10 w-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                No companies yet
              </h3>
              <p className="text-gray-600 text-lg max-w-md mx-auto mb-6">
                Get started by adding the first company for this client.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-brand-hover hover:bg-brand-sidebar text-white border-0 shadow-lg hover:shadow-xl rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Company
                </Button>
                <Button
                  onClick={() => setShowCompanyDialog(true)}
                  className="bg-brand-hover hover:bg-brand-sidebar text-white border-0 shadow-lg hover:shadow-xl rounded-xl"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Add Existing Company
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          loadCompanies();
        }}
        clientId={clientId}
        existingCompanies={companies}
      />

      {/* Delete Company Confirmation Dialog */}
      <DeleteCompanyConfirmation
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setCompanyToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        companyName={companyToDelete?.name || ""}
        personCount={Array.isArray(companyToDelete?.shareHolders) ? companyToDelete.shareHolders.length : 0}
        isLoading={isDeleting}
      />

      {/* Company Selection Dialog */}
      <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Existing Company</DialogTitle>
            <DialogDescription>
              Search and select an existing company to link with this client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-search">Search Companies</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="company-search"
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setHasSearched(false); // reset when typing
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setHasSearched(true);
                      searchCompanies(companySearch);
                    }
                  }}
                  placeholder="Type company name and press Enter..."
                  className="pl-10 h-12"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {isLoadingCompanies ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Searching companies...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">
                    {hasSearched
                      ? "No companies found. Try a different search term."
                      : "Start typing to search for companies"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {searchResults.map((company) => (
                    <button
                      key={company._id}
                      type="button"
                      onClick={() => handleCompanyClick(company)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{company.name}</p>
                          <p className="text-sm text-gray-500">
                            Reg: {company.registrationNumber}
                          </p>
                        </div>
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Selection Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Company Selection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add this company to the client?
              {pendingCompany && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-medium text-gray-900">{pendingCompany.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Reg: {pendingCompany.registrationNumber}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCompany(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSelectCompany}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

