import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCompanies, fetchCompanyById } from "@/lib/api/company";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { EngagementKYC } from "../employee/EngagementKYC";

interface Company {
  _id: string;
  name: string;
  registrationNumber?: string;
  status: "active" | "record";
}

export const DocumentKYCNew: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [effectiveCompanyId, setEffectiveCompanyId] = useState<string | null>(null);

  const handleBackClick = () => {
    navigate("/client/companies");
  };

  useEffect(() => {
    if (user?.id) {
      setClientId(user.id);
    }
  }, [user]);

  useEffect(() => {
    const initEffectiveCompany = async () => {
      if (!clientId) return;

      if (companyId) {
        setEffectiveCompanyId(companyId);
      } else {
        try {
          const companyListResult = await fetchCompanies(clientId);
          
          if (companyListResult.success && companyListResult.data && companyListResult.data.length > 0) {
            const firstId = companyListResult.data[0]._id;
            setEffectiveCompanyId(firstId);
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Error initializing default company:", error);
          setIsLoading(false);
        }
      }
    };

    initEffectiveCompany();
  }, [clientId, companyId]);

  useEffect(() => {
    if (clientId && effectiveCompanyId) {
      fetchCompanyData();
    }
  }, [clientId, effectiveCompanyId]);

  const fetchCompanyData = async () => {
    if (!effectiveCompanyId || !clientId) return;

    try {
      setIsLoading(true);
      const result = await fetchCompanyById(clientId, effectiveCompanyId);
      if (result.success) {
        setCompany(result.data);
      } else {
        throw new Error(result.message || "Failed to load company details");
      }
    } catch (error: any) {
      console.error("Error fetching company details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load company details",
        variant: "destructive",
      });
      if (companyId) navigate("/client/companies");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader size="lg" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No company data found.</p>
        <Button onClick={handleBackClick} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handleBackClick}
                className="rounded-xl bg-white border border-gray-200 text-brand-body hover:bg-gray-100 hover:text-brand-body shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold text-brand-body">
                    KYC Data
                  </h1>
                  <p className="text-gray-700">{company.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden p-6">
          <EngagementKYC 
            companyId={company._id} 
            clientId={clientId} 
            company={company} 
            isClientView={true} 
            deleteRequest={false} 
          />
        </div>
      </div>
    </div>
  );
};
