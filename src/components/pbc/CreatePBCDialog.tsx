import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreatePBCWorkflowRequest } from '@/types/pbc';

interface CreatePBCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePBCWorkflowRequest) => void;
}

export function CreatePBCDialog({ open, onOpenChange, onSubmit }: CreatePBCDialogProps) {
  const [formData, setFormData] = useState<CreatePBCWorkflowRequest>({
    engagementId: '',
    clientId: '',
    auditorId: '',
    documentRequests: [],
  });

  const [documentRequestText, setDocumentRequestText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse document requests from textarea (one per line)
    const documentRequests = documentRequestText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    onSubmit({
      ...formData,
      documentRequests,
    });

    // Reset form
    setFormData({
      engagementId: '',
      clientId: '',
      auditorId: '',
      documentRequests: [],
    });
    setDocumentRequestText('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New PBC Workflow</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="engagementId">Engagement ID</Label>
            <Input
              id="engagementId"
              value={formData.engagementId}
              onChange={(e) => setFormData(prev => ({ ...prev, engagementId: e.target.value }))}
              placeholder="Enter engagement ID"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              value={formData.clientId}
              onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="Enter client user ID"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auditorId">Auditor ID</Label>
            <Input
              id="auditorId"
              value={formData.auditorId}
              onChange={(e) => setFormData(prev => ({ ...prev, auditorId: e.target.value }))}
              placeholder="Enter auditor user ID"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentRequests">Document Request IDs</Label>
            <Textarea
              id="documentRequests"
              value={documentRequestText}
              onChange={(e) => setDocumentRequestText(e.target.value)}
              placeholder="Enter document request IDs (one per line)"
              rows={4}
            />
            <p className="text-sm text-gray-500">
              Enter each document request ID on a new line
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Workflow
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}