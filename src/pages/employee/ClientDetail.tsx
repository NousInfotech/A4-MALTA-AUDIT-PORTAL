// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Eye,
  Building2,
  Briefcase,
  Loader2,
  Users,
  Mail,
  Clock,
  TrendingUp,
  Edit,
  Delete,
} from "lucide-react"; // Added Edit icon
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEngagements } from "@/hooks/useEngagements";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { DeleteClientConfirmation } from "@/components/client/DeleteClientConfirmation";
import { CompanyList } from "@/components/client/CompanyList";

const getStatusStyle = (status: string) => {
  switch (status) {
    case "active":
      return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200";
    case "completed":
      return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200";
    case "draft":
      return "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200";
    default:
      return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200";
  }
};

interface User {
  id: string;
  name: string;
  email?: string;
  role: "admin" | "employee" | "client";
  status: string;
  createdAt: string;
  updatedAt?: string;
  companyName?: string;
  companyNumber?: string;
  industry?: string;
  summary?: string;
}

export const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { engagements } = useEngagements();
  const { logViewClient } = useActivityLogger();

  useEffect(() => {
    if (id) fetchClient(id);
  }, [id]);

  const getClientEmail = async (id: string): Promise<string> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/users/email/${id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch client email");
      const res = await response.json();
      return res.clientData.email;
    } catch (error) {
      console.error("Error fetching client email:", error);
      throw error;
    }
  };

  const filtered = engagements.filter((e) => e.clientId === id);

  const fetchClient = async (userId: string) => {
    try {
      setIsLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `user_id, name, role, status, created_at, updated_at, company_name, company_number, industry, company_summary`
        )
        .eq("user_id", userId)
        .single();
      if (profileError) throw profileError;

      let email = "Email not available";
      try {
        email = await getClientEmail(userId);
      } catch (emailError) {
        console.warn("Could not fetch email:", emailError);
      }

      const clientData = {
        id: profileData.user_id,
        name: profileData.name,
        email,
        role: profileData.role,
        status: profileData.status,
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
        companyName: profileData.company_name,
        companyNumber: profileData.company_number,
        industry: profileData.industry,
        summary: profileData.company_summary,
      };

      setClient(clientData);

      // Log client view
      logViewClient(`Viewed client details for: ${clientData.companyName}`);
    } catch (err: any) {
      console.error("Error fetching client:", err);
      toast({
        title: "Error",
        description: `Unable to load client: ${err.message}`,
        variant: "destructive",
      });
      navigate("/employee/clients");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader size="lg" text="Loading..." />
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="icon"
                asChild
                className="rounded-xl border-gray-200 hover:bg-gray-50"
              >
                <Link to="/employee/clients">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900">
                    {client.companyName}
                  </h1>
                  <p className="text-gray-700">Client Details</p>
                </div>
              </div>
            </div>

            <div>
            <Button
              variant="default"
              size="sm"
              asChild
              className="bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl rounded-xl py-3 h-auto ml-4"
            >
              <Link to={`/employee/clients/edit/${client.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </Link>
            </Button>
            
            <DeleteClientConfirmation
              clientName={client.companyName}
              onConfirm={() => {
                // No logic, just show popup
                console.log("Delete confirmed for:", client.companyName);
              }}
              isLoading={false}
            >
              <Button
                variant="default"
                size="sm"
                className="bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl rounded-xl py-3 h-auto ml-4"
              >
                <Delete className="h-4 w-4 mr-2" />
                Delete Client
              </Button>
            </DeleteClientConfirmation>
            </div>


          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Contact Information
                </h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Contact Person
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {client.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Mail className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Email Address
                    </p>
                    <p className="text-lg font-semibold text-gray-900 break-all">
                      {client.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <img
                      src="/logo.png"
                      alt="Logo"
                      className="h-10 w-10 object-cover rounded"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Role</p>
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-700 border-gray-200 rounded-xl px-4 py-1 text-sm font-semibold uppercase"
                    >
                      {client.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Company Details
                </h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Industry
                    </p>
                    <Badge
                      variant="outline"
                      className="bg-gray-100 text-gray-700 border-gray-200 rounded-xl px-4 py-1 text-sm font-semibold"
                    >
                      {client.industry || "N/A"}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 font-medium mb-2">
                    Company Summary
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    {client.summary ||
                      "No summary available for this company. "}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Clock className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">
                        Added On
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {client.updatedAt && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Last Updated
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(client.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Companies Section */}
        <div className="space-y-6 mt-8">
          <CompanyList clientId={client.id} />
        </div>

        {/* Engagements Section */}
        <div className="space-y-6 mt-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Engagements
              </h2>
              <p className="text-gray-600">
                Active and completed audit engagements
              </p>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filtered.map((engagement) => {
                return (
                  <div
                    key={engagement._id}
                    className="bg-white/80 border border-white/50 rounded-2xl shadow-lg shadow-gray-300/30 hover:bg-white/70 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-4 w-full">
                          <div className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center">
                            <Briefcase className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-semibold text-gray-900 truncate">
                              {engagement.title}
                            </h3>
                            <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                              <Building2 className="h-4 w-4" />
                              {client?.companyName || "Unknown Client"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                            engagement.status === "active"
                              ? "bg-gray-800 text-white border-gray-800"
                              : engagement.status === "completed"
                              ? "bg-gray-700 text-white border-gray-700"
                              : "bg-gray-600 text-white border-gray-600"
                          }`}
                        >
                          {engagement.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="px-6 pb-6 space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Calendar className="h-5 w-5 text-gray-600" />
                        <span className="text-sm text-gray-700 font-medium">
                          Year End:{" "}
                          {new Date(
                            engagement.yearEndDate
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <span className="text-sm text-gray-700 font-medium">
                          Trial Balance:{" "}
                          {engagement.trialBalanceUrl
                            ? "Uploaded"
                            : "Not Uploaded"}
                        </span>
                      </div>
                      <Button
                        className="w-full bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl rounded-xl py-3 h-auto"
                        size="sm"
                        variant="default"
                        asChild
                      >
                        <Link to={`/employee/engagements/${engagement._id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Briefcase className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  No engagements yet for {client.companyName}
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto">
                  This client has no engagements at the moment. Create a new
                  engagement to get started.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
