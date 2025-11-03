import React from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Plus, Download, Sparkles } from 'lucide-react';

interface ISQMHeaderProps {
  onCreateNewPack: () => void;
  onDownloadQuestionnaire: () => void;
  onGeneratePolicy: () => void;
  hasCurrentParent: boolean;
}

export function ISQMHeader({
  onCreateNewPack,
  onDownloadQuestionnaire,
  onGeneratePolicy,
  hasCurrentParent
}: ISQMHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-xl">
            <Shield className="h-8 w-8 text-gray-800" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ISQM Questionnaire</h1>
            <p className="text-gray-700">Quality Management Assessment System</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={onCreateNewPack}
            variant="outline"
            className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Pack
          </Button>
          {hasCurrentParent && (
            <>
              <Button 
                onClick={onDownloadQuestionnaire}
                variant="outline"
                className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button 
                onClick={onGeneratePolicy}
                className="bg-brand-hover hover:bg-brand-sidebar text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Policy
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}