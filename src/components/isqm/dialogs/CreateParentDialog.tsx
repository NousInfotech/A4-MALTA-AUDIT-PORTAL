import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, XCircle, AlertCircle, Save } from 'lucide-react';

interface CreateParentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  newParent: {
    title: string;
    version: string;
    jurisdiction: string;
    sources: string[];
  };
  onUpdateParent: (updates: Partial<{
    title: string;
    version: string;
    jurisdiction: string;
    sources: string[];
  }>) => void;
}

export const CreateParentDialog: React.FC<CreateParentDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  newParent,
  onUpdateParent
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-xl">
                <Plus className="w-5 h-5 text-gray-800" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create New ISQM Pack</h3>
                <p className="text-sm text-gray-700">Create a new ISQM Quality Management Pack</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-800 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Default Pack Configuration</span>
            </div>
            <p className="text-sm text-gray-700">
              This will create a new ISQM pack with ISQM 1, ISQM 2, and ISA 220 (Revised) questionnaires 
              containing all standard questions from the IAASB framework.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Pack Title</label>
              <Input
                value={newParent.title}
                onChange={(e) => onUpdateParent({ title: e.target.value })}
                placeholder="Enter pack title..."
                className="border-2 border-gray-200 focus:border-gray-400 rounded-xl bg-white/80 backdrop-blur-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Version</label>
              <Input
                value={newParent.version}
                onChange={(e) => onUpdateParent({ version: e.target.value })}
                placeholder="Enter version..."
                className="border-2 border-gray-200 focus:border-gray-400 rounded-xl bg-white/80 backdrop-blur-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-2">Jurisdiction</label>
              <Textarea
                value={newParent.jurisdiction}
                onChange={(e) => onUpdateParent({ jurisdiction: e.target.value })}
                placeholder="Enter jurisdiction information..."
                className="border-2 border-gray-200 focus:border-gray-400 rounded-xl bg-white/80 backdrop-blur-sm"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={onCreate}
              className="bg-gray-800 hover:bg-gray-900 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Pack
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

