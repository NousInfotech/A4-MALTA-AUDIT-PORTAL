import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle, AlertCircle, Folder } from 'lucide-react';
import { DocumentRequest } from '@/types/pbc';
import { PbcFileBrowser } from './PbcFileBrowser';

interface DocumentRequestsViewProps {
  documentRequests: DocumentRequest[];
  userRole: 'employee' | 'client' | 'admin';
}

export function DocumentRequestsView({ documentRequests, userRole }: DocumentRequestsViewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'submitted':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusCounts = () => {
    return {
      pending: documentRequests.filter(d => d.status === 'pending').length,
      submitted: documentRequests.filter(d => d.status === 'submitted').length,
      approved: documentRequests.filter(d => d.status === 'approved').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Document Requests</h2>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">{statusCounts.pending}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{statusCounts.submitted}</div>
            <div className="text-xs text-gray-500">Submitted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{statusCounts.approved}</div>
            <div className="text-xs text-gray-500">Approved</div>
          </div>
        </div>
      </div>

      {documentRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No document requests</h3>
            <p className="text-gray-600">No documents have been requested yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-start">
          {documentRequests.map((request, index) => (
            <>
            {/* <div key={index} className="flex items-center gap-2 p-4">
              <Folder size={48} className="text-blue-500" />
              <p className="mt-2 text-sm font-semibold text-center">{request.category}</p>
            </div> */}
            <div>
              <PbcFileBrowser />
            </div>

            {/* <Card key={request._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{request.category}</CardTitle>
                  {getStatusIcon(request.status)}
                </div>
                <Badge className={`${getStatusColor(request.status)} text-white w-fit`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{request.description}</p>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Status: {request.status}</span>
                    <span>ID: {request._id.slice(-6)}</span>
                  </div>
                </div>
              </CardContent>
            </Card> */}
            </>
          ))}
        </div>
      )}

      {/* Status Summary */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">{statusCounts.pending}</div>
              <div className="text-sm text-gray-600">Pending Requests</div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div 
                  className="bg-gray-400 h-1 rounded-full"
                  style={{
                    width: `${documentRequests.length > 0 ? (statusCounts.pending / documentRequests.length) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{statusCounts.submitted}</div>
              <div className="text-sm text-gray-600">Submitted</div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div 
                  className="bg-blue-500 h-1 rounded-full"
                  style={{
                    width: `${documentRequests.length > 0 ? (statusCounts.submitted / documentRequests.length) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{statusCounts.approved}</div>
              <div className="text-sm text-gray-600">Approved</div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div 
                  className="bg-green-500 h-1 rounded-full"
                  style={{
                    width: `${documentRequests.length > 0 ? (statusCounts.approved / documentRequests.length) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}