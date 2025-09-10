import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { ReviewNotesProvider } from "@/contexts/ReviewNotesContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Auth pages
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { PendingApprovalPage } from "@/pages/auth/PendingApprovalPage";

// Admin pages
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { UserManagement } from "@/pages/admin/UserManagement";
import { AuditorLogs } from "@/pages/admin/AuditorLogs";
import ISQMQuestionnairePage from "@/pages/admin/ISQMQuestionnairePage";

// Employee pages
import { EmployeeDashboard } from "@/pages/employee/EmployeeDashboard";
import { ClientManagement } from "@/pages/employee/ClientManagement";
import { AddClient } from "@/pages/employee/AddClient";
import { EngagementManagement } from "@/pages/employee/EngagementManagement";
import { CreateEngagement } from "@/pages/employee/CreateEngagement";
import { EngagementDetails } from "@/pages/employee/EngagementDetails";
import GlobalLibraryPage from "./pages/employee/Library";

// Client pages
import { ClientDashboard } from "@/pages/client/ClientDashboard";
import { ClientEngagements } from "@/pages/client/ClientEngagements";
import { DocumentRequests } from "@/pages/client/DocumentRequests";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ClientDetail } from "./pages/employee/ClientDetail";

import AccountDataTab from "./components/accounts-integration/AccountDataTab";

import CallbackPage from "./components/saltedge/SaltEdgeCallback";
import PBCAuditWorkflow from "./components/pbc-components/PBCAuditWorkflow";
import PbcHome from "./components/pbc/PbcHome";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <ReviewNotesProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route
                  path="/pending-approval"
                  element={<PendingApprovalPage />}
                />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
              </Route>

              {/* Employee Routes */}
              <Route
                path="/employee"
                element={
                  <ProtectedRoute allowedRoles={["employee"]}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<EmployeeDashboard />} />
                <Route path="clients" element={<ClientManagement />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="clients/new" element={<AddClient />} />
                <Route path="engagements" element={<EngagementManagement />} />
                <Route path="engagements/new" element={<CreateEngagement />} />
                <Route path="engagements/:id" element={<EngagementDetails />} />
                <Route path="library" element={<GlobalLibraryPage />} />
                <Route path="accounts" element={<AccountDataTab />} />
                <Route path="salt-edge/callback" element={<CallbackPage />} />
              </Route>

                {/* Client Routes */}
                <Route
                  path="/client"
                  element={
                    <ProtectedRoute allowedRoles={["client"]}>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<ClientDashboard />} />
                  <Route path="engagements" element={<ClientEngagements />} />
                  <Route path="requests" element={<DocumentRequests />} />
                  <Route path="accounts" element={<AccountDataTab />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ReviewNotesProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
