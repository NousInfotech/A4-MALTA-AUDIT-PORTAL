import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { ISQMQuestionnaire } from '@/hooks/useISQM';

interface EditQuestionnaireDialogProps {
  editingQuestionnaire: ISQMQuestionnaire | null;
  onClose: () => void;
  onSave: () => void;
  onUpdateQuestionnaire: (updates: Partial<ISQMQuestionnaire>) => void;
}

export const EditQuestionnaireDialog: React.FC<EditQuestionnaireDialogProps> = ({
  editingQuestionnaire,
  onClose,
  onSave,
  onUpdateQuestionnaire
}) => {
  if (!editingQuestionnaire) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 rounded-2xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-gray-900">Edit Questionnaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-800">Heading</label>
            <Input
              value={editingQuestionnaire.heading}
              onChange={(e) => onUpdateQuestionnaire({
                ...editingQuestionnaire,
                heading: e.target.value
              })}
              className="bg-white/80 backdrop-blur-sm border-gray-200 focus:border-gray-400 rounded-xl"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-800">Description</label>
            <Textarea
              value={editingQuestionnaire.description}
              onChange={(e) => onUpdateQuestionnaire({
                ...editingQuestionnaire,
                description: e.target.value
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


