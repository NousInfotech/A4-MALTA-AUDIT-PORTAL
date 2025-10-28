import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit, Trash2, Users, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateCompanyModal } from "./CreateCompanyModal";
import { CompanyDetailModal } from "./CompanyDetailModal";
import { DeleteCompanyConfirmation } from "./DeleteCompanyConfirmation";

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
  persons?: Person[];
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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
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
      fetchCompanies();
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
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/client/${clientId}/company/${companyToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete company");

      toast({
        title: "Success",
        description: "Company deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      setCompanyToDelete(null);
      fetchCompanies();
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
    setSelectedCompany(company);
    setIsDetailModalOpen(true);
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
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Companies</h2>
              <p className="text-gray-600">
                Associated companies and ownership structures
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>

        {/* Companies Grid */}
        {companies.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {companies.map((company) => (
              <Card
                key={company._id}
                className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 hover:bg-white/70 transition-all cursor-pointer"
                onClick={() => handleViewDetails(company)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center">
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
                    <div className="flex items-center gap-2">
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
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{company.persons?.length || 0} Persons</span>
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
                        variant="ghost"
                        size="sm"
                        className="flex-1 hover:bg-gray-100 rounded-xl"
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
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
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
          fetchCompanies();
        }}
        clientId={clientId}
        existingCompanies={companies}
      />

      {/* Company Detail Modal */}
      <CompanyDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCompany(null);
        }}
        company={selectedCompany as any}
        clientId={clientId}
        onUpdate={fetchCompanies}
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
        personCount={Array.isArray(companyToDelete?.persons) ? companyToDelete.persons.length : 0}
        isLoading={isDeleting}
      />
    </>
  );
};

