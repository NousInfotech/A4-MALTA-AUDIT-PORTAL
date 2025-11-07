import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { ReviewNotesProvider } from "@/contexts/ReviewNotesContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { TourProvider } from "@/contexts/TourContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { NotificationInitializer } from "@/components/notifications";

// Auth pages
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { PendingApprovalPage } from "@/pages/auth/PendingApprovalPage";

// Admin pages
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { UserManagement } from "@/pages/admin/UserManagement";
import { AuditorLogs } from "@/pages/admin/AuditorLogs";
import AdminISQMQuestionnairePage from "@/pages/admin/ISQMQuestionnairePage";
import BrandingSettings from "@/pages/admin/BrandingSettings";

// Employee pages
import { EmployeeDashboard } from "@/pages/employee/EmployeeDashboard";
import { ClientManagement } from "@/pages/employee/ClientManagement";
import { AddClient } from "@/pages/employee/AddClient";
import { EngagementManagement } from "@/pages/employee/EngagementManagement";
import { CreateEngagement } from "@/pages/employee/CreateEngagement";
import { EngagementDetails } from "@/pages/employee/EngagementDetails";
import GlobalLibraryPage from "./pages/employee/Library";
import ISQMQuestionnairePage from "@/pages/employee/ISQMQuestionnairePage";
import KYCEnhancedManagement from "@/pages/employee/KYCEnhancedManagement";

// Client pages
import { ClientDashboard } from "@/pages/client/ClientDashboard";
import { ClientEngagements } from "@/pages/client/ClientEngagements";
import { DocumentRequests } from "@/pages/client/DocumentRequests";


import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ClientDetail } from "./pages/employee/ClientDetail";
import { CompanyDetail } from "./pages/employee/CompanyDetail";

import RoleBasedAccountDataTab from "./components/accounts-integration/RoleBasedAccountDataTab";

import CallbackPage from "./components/saltedge/SaltEdgeCallback";
import ReviewDetailsPage from "./components/review-components/ReviewDetailsPage";
import ReviewPage from "./pages/ReviewPage";
import MockApideckHome from "./mockdata/MockApideckHome";
import { PromptManagement } from "./pages/admin/PromptManagement";
import WorkBookApp from "./components/audit-workbooks/WorkBookApp";
import { AnalyticalReviewSection } from "./components/analitical review/AnalyticalReviewSection";

import { EditClient } from "./pages/employee/EditClient";
import { SidebarStatsProvider } from "./contexts/SidebarStatsContext";
import { NotificationSettingsPage } from "./pages/settings/NotificationSettingsPage";
import { NotificationSettingsRedirect } from "./components/notifications/NotificationSettingsRedirect";




const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrandingProvider>
      <AuthProvider>
        <NotificationInitializer />
        <TourProvider>
          <DataProvider>
          <SidebarStatsProvider>  
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
                <Route path="prompts" element={<PromptManagement />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="logs" element={<AuditorLogs />} />
                <Route path="isqm" element={<AdminISQMQuestionnairePage />} />
                <Route path="branding" element={<BrandingSettings />} />
                <Route path="settings/notifications" element={<NotificationSettingsPage />} />
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
                <Route path="clients/new" element={<AddClient />} />
                <Route path="clients/edit/:id" element={<EditClient />} />
                <Route path="clients/:clientId/company/:companyId" element={<CompanyDetail />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="engagements" element={<EngagementManagement />} />
                <Route path="engagements/new" element={<CreateEngagement />} />
                <Route path="engagements/:id" element={<EngagementDetails />} />
                <Route path="library" element={<GlobalLibraryPage />} />
                <Route path="isqm" element={<ISQMQuestionnairePage />} />
                <Route path="kyc/:engagementId" element={<KYCEnhancedManagement />} />
                <Route path="kyc" element={<KYCEnhancedManagement />} />
                <Route path="accounts" element={<RoleBasedAccountDataTab />} />
                <Route path="salt-edge/callback" element={<CallbackPage />} />
                <Route path="review/:engagementId" element={<ReviewDetailsPage />} />
                <Route path="review/" element={<ReviewPage />} />
                <Route path="mockapideck" element={<MockApideckHome />} />
                <Route path="audit-workbook" element={<WorkBookApp engagementId={null} classification={null} />} />
                <Route path="analytics" element={<AnalyticalReviewSection />} />
                <Route path="settings/notifications" element={<NotificationSettingsPage />} />
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
              
                  <Route path="accounts" element={<RoleBasedAccountDataTab />} />
                  <Route path="settings/notifications" element={<NotificationSettingsPage />} />
                  
                </Route>

                {/* Redirect /settings/notifications to role-based path */}
                <Route 
                  path="/settings/notifications" 
                  element={<NotificationSettingsRedirect />} 
                />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </TooltipProvider>
          </ReviewNotesProvider>
          </SidebarStatsProvider>
          </DataProvider>
        </TourProvider>
      </AuthProvider>
    </BrandingProvider>
  </QueryClientProvider>
);

export default App;
