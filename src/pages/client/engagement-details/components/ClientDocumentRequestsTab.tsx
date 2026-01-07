import { DocumentRequestsTab } from "@/components/engagement/DocumentRequestsTab";

interface ClientDocumentRequestsTabProps {
  engagementId: string;
  requests: any[];
  loading: boolean;
  engagement: any;
}

export const ClientDocumentRequestsTab = ({ 
  engagementId, 
  requests, 
  loading,
  engagement
}: ClientDocumentRequestsTabProps) => {
  return (
    <div className="space-y-6">
      <DocumentRequestsTab 
        requests={requests}
        engagement={engagement}
        isReadOnly={true}
      />
    </div>
  );
};
