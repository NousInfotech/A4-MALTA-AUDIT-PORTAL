import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';

interface EditSectionDialogProps {
  isOpen: boolean;
  questionnaireId: string;
  sectionIndex: number;
  currentHeading: string;
  onClose: () => void;
  onSave: () => void;
  onUpdateHeading: (heading: string) => void;
}

export const EditSectionDialog: React.FC<EditSectionDialogProps> = ({
  isOpen,
  questionnaireId,
  sectionIndex,
  currentHeading,
  onClose,
  onSave,
  onUpdateHeading
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Edit Section Heading</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-800">Section Heading</label>
            <Input
              value={currentHeading}
              onChange={(e) => onUpdateHeading(e.target.value)}
              placeholder="Enter section heading..."
              className="bg-white/80 backdrop-blur-sm border-gray-200 focus:border-gray-400 rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-300 hover:bg-gray-100">
            Cancel
          </Button>
          <Button onClick={onSave} className="bg-gray-800 hover:bg-gray-900 text-white">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
