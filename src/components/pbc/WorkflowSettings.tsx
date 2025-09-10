import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings, Save, Trash2 } from 'lucide-react';
import { PBCWorkflow } from '@/types/pbc';
import { pbcApi } from '@/lib/api/pbc-workflow';


interface WorkflowSettingsProps {
  workflow: PBCWorkflow;
  userRole: 'employee' | 'client' | 'admin';
  onUpdate: (workflow: PBCWorkflow) => void;
}

export function WorkflowSettings({ workflow, userRole, onUpdate }: WorkflowSettingsProps) {
  // Change the initial state type to 'string' to accommodate the Select component's output
  const [selectedStatus, setSelectedStatus] = useState<string>(workflow.status); 
  const [loading, setLoading] = useState(false);

  const canEdit = userRole === 'employee' || userRole === 'admin';

  const statusOptions = [
    { value: 'document-collection', label: 'Document Collection' },
    { value: 'qna-preparation', label: 'Q&A Preparation' },
    { value: 'client-responses', label: 'Client Responses' },
    { value: 'doubt-resolution', label: 'Doubt Resolution' },
    { value: 'submitted', label: 'Submitted' },
  ];

  const handleStatusUpdate = async () => {
    if (selectedStatus === workflow.status) return;

    try {
      setLoading(true);
      const updatedWorkflow = await pbcApi.updatePBCWorkflow(workflow._id, {
        // Ensure the API expects a string for status, which it likely does.
        status: selectedStatus, 
      });
      onUpdate(updatedWorkflow);
    } catch (error) {
      console.error('Error updating workflow status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!confirm('Are you sure you want to delete this entire workflow? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await pbcApi.deletePBCWorkflow(workflow._id);
      // Redirect back to dashboard would be handled by parent component
    } catch (error) {
      console.error('Error deleting workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'document-collection':
        return 'Initial phase where required documents are being collected from the client.';
      case 'qna-preparation':
        return 'Auditor is preparing Q&A questions based on collected documents.';
      case 'client-responses':
        return 'Client is answering the prepared questions.';
      case 'doubt-resolution':
        return 'Resolving any doubts or clarifications from the client.';
      case 'submitted':
        return 'PBC process is complete and submitted.';
      default:
        return 'Unknown status';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Workflow Settings</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Current Status
              </label>
              <Badge className="mb-3">{workflow.status}</Badge>
              <p className="text-sm text-gray-600">
                {getStatusDescription(workflow.status)}
              </p>
            </div>

            {canEdit && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 block">
                  Update Status
                </label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedStatus !== workflow.status && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {getStatusDescription(selectedStatus)}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleStatusUpdate}
                  disabled={loading || selectedStatus === workflow.status}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Update Status
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Workflow ID:</span>
                <p className="font-mono text-sm break-all">{workflow._id}</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Engagement:</span>
                <p className="text-sm">{workflow.engagement.title}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Client ID:</span>
                <p className="font-mono text-sm">{workflow.clientId}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Auditor ID:</span>
                <p className="font-mono text-sm">{workflow.auditorId}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Created:</span>
                <p className="text-sm">{formatDate(workflow.createdAt)}</p>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Last Updated:</span>
                <p className="text-sm">{formatDate(workflow.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {canEdit && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-800 mb-2">Delete Workflow</h4>
                <p className="text-sm text-red-600 mb-4">
                  This will permanently delete the entire PBC workflow, including all categories,
                  questions, and discussions. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDeleteWorkflow}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Workflow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}