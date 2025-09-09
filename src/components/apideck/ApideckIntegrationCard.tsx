import React, { useEffect, useState } from "react";

import { ApideckVault, Connection } from "@apideck/vault-js";
import { useAuth } from "@/contexts/AuthContext";

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
      toast.error("Failed to initialize Apideck connection");
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
    <div className="rounded-lg p-5 bg-gray-100">
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Card Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <span className="text-lg font-bold text-blue-600">A</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            Connect Accounting System
          </h2>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Connect your accounting software (QuickBooks, Xero, etc.) to
          automatically import financial data.
        </p>
      </div>

      {/* Card Content */}
      <div className="p-6 space-y-5">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Supported platforms:</p>
          <div className="flex flex-wrap gap-2">
            {["QuickBooks", "Xero", "Sage", "FreshBooks"].map((platform) => (
              <span
                key={platform}
                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={handleOpenVault}
          disabled={loading || !linkToken || isVaultOpen} // Disable if vault is already open
          className={`w-full px-4 py-2 rounded-md font-semibold text-white
                     transition-colors duration-200
                     ${
                       loading || !linkToken || isVaultOpen
                         ? "bg-blue-300 cursor-not-allowed"
                         : "bg-blue-600 hover:bg-blue-700"
                     }`}
        >
          {loading
            ? "Initializing..."
            : isVaultOpen
            ? "Vault Open..."
            : "Connect Accounting System"}
        </button>
        {loading && (
          <p className="text-sm text-gray-500 text-center">
            Fetching connection details...
          </p>
        )}
      </div>
    </div>
    </div>
  );
};

export default ApideckIntegrationCard;
