import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { ISQMParent } from '@/hooks/useISQM';

interface ParentSelectionProps {
  parents: ISQMParent[];
  selectedParent: string;
  onParentChange: (parentId: string) => void;
  onCreateNewPack: () => void;
  onEditParent: (parentId: string) => void;
  onDeleteParent: (parentId: string) => void;
  isAdmin: boolean;
}

export const ParentSelection: React.FC<ParentSelectionProps> = ({
  parents,
  selectedParent,
  onParentChange,
  onCreateNewPack,
  onEditParent,
  onDeleteParent,
  isAdmin
}) => {
  return (
    <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-xl">
            <FileText className="w-5 h-5 text-gray-800" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Select ISQM Pack</h3>
            <p className="text-sm text-gray-700">Choose an existing pack or create a new one</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-center">
          <select
            value={selectedParent}
            onChange={(e) => onParentChange(e.target.value)}
            className="flex-1 border-2 border-gray-200 focus:border-gray-400 rounded-xl px-4 py-2 bg-white/80 backdrop-blur-sm"
          >
            <option value="">Select an ISQM Pack...</option>
            {parents.map((parent) => (
              <option key={parent._id} value={parent._id}>
                {parent.metadata.title} ({parent.status}) - {parent.completionStats.completionPercentage.toFixed(1)}% Complete
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button 
              onClick={onCreateNewPack}
              className="bg-brand-hover hover:bg-brand-sidebar text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
            
            {selectedParent && (
              <>
                <Button 
                  onClick={() => onEditParent(selectedParent)}
                  variant="outline"
                  className="hover:bg-gray-100 border-gray-300"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                {isAdmin && (
                  <Button 
                    onClick={() => onDeleteParent(selectedParent)}
                    variant="outline"
                    className="hover:bg-red-50 text-red-600 border-red-300"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
