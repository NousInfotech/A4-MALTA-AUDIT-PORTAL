"use client";

import { useEffect, useState } from "react";

import ConnectionCard from "./ConnectionCard";
import ConnectButton from "./ConnectButton";
import { SaltEdgeAccountDataModal } from "./SaltEdgeAccountDataModal";
import { useAuth } from "@/contexts/AuthContext";
import { fetchConnections } from "@/lib/api/saltedge";

export default function BankData() {
  const { user, isLoading: authLoading } = useAuth();

  const [connections, setConnections] = useState<any>([]);
  const [selectedConnection, setSelectedConnection] = useState<any | null>(
    null
  );

  const handleConnectionSelect = (currentAccount: any) => {
    setSelectedConnection(currentAccount);
  };

  const handleCloseModal = () => {
    setSelectedConnection(null);
  };

  const listConnections = async (customerId: string) => {
    try {
      const connections = await fetchConnections(customerId);
      console.log("connections", connections);
      setConnections(connections);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    console.log(user);
    if (!authLoading && user?.bankconnectionid) {
      listConnections(user?.bankconnectionid);
    }
  }, [authLoading, user, user?.bankconnectionid]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Financial Dashboard</h1>

      <div className="mb-6 rounded-lg border p-6 text-center">
        <ConnectButton />
      </div>

      {connections.length > 0 && (
        <>
          <div className="container mx-auto grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection: any) => (
              <ConnectionCard
                key={connection?.id}
                connection={connection}
                onSelect={handleConnectionSelect}
              />
            ))}
          </div>
        </>
      )}

      {selectedConnection && (
        <SaltEdgeAccountDataModal
          connectionId={selectedConnection?.id}
          isOpen={!!selectedConnection}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
