import { useState } from "react";
import { PBCDashboard } from "@/components/pbc/PBCDashboard";
import { PBCWorkflowDetail } from "@/components/pbc/PBCWorkflowDetail";
import { PBCWorkflow, User } from "@/types/pbc";
import { Button } from "@/components/ui/button";

import { FileCheck, User as UserIcon } from "lucide-react";

function PbcHome({ selectedEngagement }) {
  const [currentUser] = useState<User>({
    _id: "user-123",
    name: "John Doe",
    email: "john.doe@example.com",
    role: "employee", // Can be 'employee', 'client', or 'admin'
  });

  const [selectedWorkflow, setSelectedWorkflow] = useState<PBCWorkflow | null>(
    null
  );
  const [userRole, setUserRole] = useState<"employee" | "client" | "admin">(
    currentUser.role
  );

  const handleSelectWorkflow = (workflow: PBCWorkflow) => {
    setSelectedWorkflow(workflow);
  };

  const handleBackToDashboard = () => {
    setSelectedWorkflow(null);
  };

  const handleWorkflowUpdate = (updatedWorkflow: PBCWorkflow) => {
    setSelectedWorkflow(updatedWorkflow);
  };

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-white/60 backdrop-blur-md border-b border-white/30 shadow-lg shadow-gray-300/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-gray-800" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">PBC Manager</h1>
                <p className="text-sm text-gray-600">
                  Prepared By Client Workflow
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedWorkflow ? (
          <PBCWorkflowDetail
            workflow={selectedWorkflow}
            userRole={userRole}
            onBack={handleBackToDashboard}
            onWorkflowUpdate={handleWorkflowUpdate}
          />
        ) : (
          <PBCDashboard
            userRole={userRole}
            onSelectWorkflow={handleSelectWorkflow}
            selectedEngagement={selectedEngagement}
          />
        )}
      </main>
    </div>
  );
}

export default PbcHome;
