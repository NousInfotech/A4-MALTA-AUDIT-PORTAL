import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';

interface AddQuestionNoteDialogProps {
  isOpen: boolean;
  questionnaireId: string;
  sectionIndex: number;
  questionIndex: number;
  note: string;
  onClose: () => void;
  onSave: () => void;
  onUpdateNote: (note: string) => void;
}

export const AddQuestionNoteDialog: React.FC<AddQuestionNoteDialogProps> = ({
  isOpen,
  questionnaireId,
  sectionIndex,
  questionIndex,
  note,
  onClose,
  onSave,
  onUpdateNote
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Add Question Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-800">Note</label>
            <Textarea
              value={note}
              onChange={(e) => onUpdateNote(e.target.value)}
              placeholder="Enter question note..."
              className="bg-white/80 backdrop-blur-sm border-gray-200 focus:border-gray-400 rounded-xl"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-300 hover:bg-gray-100">
            Cancel
          </Button>
          <Button onClick={onSave} className="bg-brand-hover hover:bg-brand-sidebar text-white">
            <Save className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


