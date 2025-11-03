import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { ISQMParent } from '@/hooks/useISQM';

interface EditParentDialogProps {
  editingParent: ISQMParent | null;
  onClose: () => void;
  onSave: () => void;
  onUpdateParent: (updates: Partial<ISQMParent>) => void;
}

export const EditParentDialog: React.FC<EditParentDialogProps> = ({
  editingParent,
  onClose,
  onSave,
  onUpdateParent
}) => {
  if (!editingParent) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 rounded-2xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-gray-900">Edit ISQM Pack</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-800">Title</label>
            <Input
              value={editingParent.metadata.title}
              onChange={(e) => onUpdateParent({
                ...editingParent,
                metadata: { ...editingParent.metadata, title: e.target.value }
              })}
              className="bg-white/80 backdrop-blur-sm border-gray-200 focus:border-gray-400 rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-800">Version</label>
            <Input
              value={editingParent.metadata.version}
              onChange={(e) => onUpdateParent({
                ...editingParent,
                metadata: { ...editingParent.metadata, version: e.target.value }
              })}
              className="bg-white/80 backdrop-blur-sm border-gray-200 focus:border-gray-400 rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-800">Jurisdiction</label>
            <Textarea
              value={editingParent.metadata.jurisdiction_note}
              onChange={(e) => onUpdateParent({
                ...editingParent,
                metadata: { ...editingParent.metadata, jurisdiction_note: e.target.value }
              })}
              className="bg-white/80 backdrop-blur-sm border-gray-200 focus:border-gray-400 rounded-xl"
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={onSave} className="bg-brand-hover hover:bg-brand-sidebar text-white">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};


