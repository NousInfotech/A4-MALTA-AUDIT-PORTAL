import React from 'react';
import { KYCEnhancedManagement } from '@/components/kyc/KYCEnhancedManagement';

export default function KYCEnhancedManagementPage() {
  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        <KYCEnhancedManagement userRole="auditor" />
      </div>
    </div>
  );
}
