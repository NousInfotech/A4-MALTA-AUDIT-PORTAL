import { useState } from "react";

import { PBCWorkflow, User } from "@/types/pbc";

import { useAuth } from "@/contexts/AuthContext";
import { PBCWorkflowInfo } from "@/components/pbc/PBCWorkflowInfo";


function ClientPbcManager({ workflow }) {
  const { user: currentUser, isLoading: authLoading } = useAuth();

  const [selectedWorkflow, setSelectedWorkflow] = useState<PBCWorkflow | null>(
    null
  );
  const [userRole, setUserRole] = useState<"employee" | "client" | "admin">(
    currentUser.role
  );

  const handleWorkflowUpdate = (updatedWorkflow: PBCWorkflow) => {
    setSelectedWorkflow(updatedWorkflow);
  };

  return (
    <div className="bg-amber-50 rounded-b-lg">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {workflow && (
          <PBCWorkflowInfo
            workflow={workflow}
            userRole={userRole}
            onWorkflowUpdate={handleWorkflowUpdate}
          />
        )}
      </main>
    </div>
  );
}

export default ClientPbcManager;
