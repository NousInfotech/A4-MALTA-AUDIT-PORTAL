import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApideckVault, Connection } from "@apideck/vault-js";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, Shield, Lock, Building2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { createSessionAndGetTokenFromApideck } from "@/lib/api/apideck";

interface ApideckIntegrationCardProps {
  onSubmit: (integration: any) => void;
}

const ApideckIntegrationCard: React.FC<ApideckIntegrationCardProps> = ({
  onSubmit,
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  const fetchToken = async () => {
    try {
      setLoading(true);
      console.log("[ApideckIntegrationCard] Fetching link token...");
      if (!user?.id) return;

      if (user?.id) {
        const token = await createSessionAndGetTokenFromApideck(user.id);
        console.log(token);
        console.log("[ApideckIntegrationCard] Received token:", token);
        if (token) setLinkToken(token);
      }
    } catch (error) {
      console.error(
        "[ApideckIntegrationCard] Error fetching link token:",
        error
      );
      console.error("Failed to initialize Apideck connection")
      console.log("Failed to initialize Apideck connection")
      // toast.error("Failed to initialize Apideck connection");
    } finally {
      setLoading(false);
      console.log("[ApideckIntegrationCard] Loading set to false");
    }
  };

  useEffect(() => {
    if (user && !authLoading && !linkToken) {
      fetchToken();
    }
  }, [user, user?.id, authLoading, linkToken]);

  const handleOpenVault = async () => {
    if (!linkToken) {
      toast.error("Vault not ready. Please try again.");
      return;
    }
    if (!user?.id) {
      toast.error("User not authenticated. Please log in again.");
      return;
    }

    try {
      setIsVaultOpen(true);
      ApideckVault.open({
        token: linkToken,
        onConnectionChange: async (connection: Connection) => {
          console.log("Apideck Connection Changed:", connection);
          try {
            onSubmit({ connection });
            toast.success("Accounting integration connected successfully!");
          } catch (error) {
            console.error("Failed to save integration:", error);
            toast.error("Failed to save integration details on your backend.");
          } finally {
            setIsVaultOpen(false);

            setLinkToken(null);
          }
        },
        onClose: () => {
          console.log("Apideck Vault closed by user.");
          setIsVaultOpen(false);

          setLinkToken(null);
        },
        onReady: () => {
          console.log("Apideck Vault ready.");
        },
      });
    } catch (error) {
      console.error("Failed to open Apideck Vault:", error);
      toast.error("Failed to open Apideck Vault");
      setIsVaultOpen(false);
    }
  };

  return (
    <Card className="group bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-gray-300 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-gray-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <CardHeader className="relative pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors duration-300">
              Connect Accounting System
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2 text-lg">
              Connect your accounting software (QuickBooks, Xero, etc.) to automatically import financial data through our unified API platform.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Multiple Platforms</p>
              <p className="text-sm text-gray-600">QuickBooks, Xero, Sage</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Enterprise Security</p>
              <p className="text-sm text-gray-600">Bank-level protection</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-600">Supported platforms:</p>
          <div className="flex flex-wrap gap-2">
            {["QuickBooks", "Xero", "Sage", "FreshBooks"].map((platform) => (
              <Badge
                key={platform}
                className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 rounded-xl px-3 py-1 text-xs font-semibold"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {platform}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
          <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 rounded-xl px-4 py-2 text-sm font-semibold">
            <Shield className="h-4 w-4 mr-2" />
            Secure Integration
          </Badge>
          <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 rounded-xl px-4 py-2 text-sm font-semibold">
            <Lock className="h-4 w-4 mr-2" />
            OAuth 2.0
          </Badge>
        </div>
      </CardContent>

      <div className="relative p-6 pt-0">
        <Button
          onClick={handleOpenVault}
          disabled={loading || !linkToken || isVaultOpen}
          className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-4 h-auto text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-105"
          size="lg"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
              Initializing...
            </>
          ) : isVaultOpen ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
              Vault Open...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 mr-3" />
              Connect Accounting System
            </>
          )}
        </Button>
        
        {loading && (
          <p className="text-sm text-gray-500 text-center mt-3">
            Fetching connection details...
          </p>
        )}
      </div>
    </Card>
  );
};

export default ApideckIntegrationCard;
