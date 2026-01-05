import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCompanies } from "@/lib/api/company";
import { Building2, ArrowRight, MapPin, Globe, Loader2, Info } from "lucide-react";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { useToast } from "@/hooks/use-toast";

export const ClientCompanies = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      setClientId(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (clientId) {
      const loadCompanies = async () => {
        try {
          setLoading(true);
          console.log("Loading companies for clientId:", clientId);
          const result = await fetchCompanies(clientId);
          console.log("Fetch companies result:", result);
          const data = result.data || [];
          setCompanies(data);

          // If there's only one company, automatically redirect to its details
          if (data.length === 1 && data[0]._id) {
            navigate(`/client/companies/${data[0]._id}`);
          }
        } catch (error: any) {
          console.error("Error fetching companies:", error);
          toast({
            title: "Error",
            description: `Failed to load companies: ${error.message || "Unknown error"}`,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };
      loadCompanies();
    }
  }, [clientId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-body flex items-center justify-center">
        <EnhancedLoader size="lg" text="Loading your companies..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-brand-body mb-2">My Companies</h1>
          <p className="text-brand-body opacity-80">View and manage your business entities.</p>
        </div>

        {companies.length === 0 ? (
          <div className="bg-white/80 border border-white/50 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Companies Found</h3>
            <p className="text-gray-600">You don't have any companies assigned to your account yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Link key={company._id} to={`/client/companies/${company._id}`}>
                <Card className="bg-white/80 border border-white/50 rounded-2xl hover:bg-white/90 shadow-lg shadow-gray-300/30 transition-all hover:scale-[1.02] cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px] font-bold">
                      {company.status || 'Active'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <CardTitle className="text-xl font-bold text-gray-900 mb-4">{company.name}</CardTitle>
                    
                    <div className="space-y-3">
                      {company.registrationNumber && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Info className="h-4 w-4 text-primary/60" />
                          <span>Reg: {company.registrationNumber}</span>
                        </div>
                      )}
                      {company.industry && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Globe className="h-4 w-4 text-primary/60" />
                          <span>{company.industry}</span>
                        </div>
                      )}
                      {company.address && (
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mt-0.5 text-primary/60" />
                          <span className="line-clamp-2">{company.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Button variant="ghost" className="text-primary hover:text-primary/80 p-0 h-auto font-semibold">
                        View Details <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
