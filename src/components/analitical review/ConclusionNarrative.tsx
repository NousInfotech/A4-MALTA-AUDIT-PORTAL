// components/ConclusionNarrative.tsx
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ConclusionNarrativeProps {
  conclusion: string;
  setConclusion: (value: string) => void;
  isEnabled: boolean; // From AnalyticalReviewSection
}

export const ConclusionNarrative: React.FC<ConclusionNarrativeProps> = ({
  conclusion,
  setConclusion,
  isEnabled,
}) => {
  return (
    <div className={`space-y-2 p-6 rounded-lg border ${isEnabled ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-brand-hover' : 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-brand-sidebar'}`}>
      <Label htmlFor="conclusion-narrative" className="text-lg font-semibold text-gray-800 dark:text-gray-200">
        Conclusion Narrative
      </Label>
      <Textarea
        id="conclusion-narrative"
        value={conclusion}
        onChange={(e) => setConclusion(e.target.value)}
        placeholder={
          isEnabled
            ? "Summarize whether the analytical review highlights any anomalies, supports or contradicts audit evidence, or triggers further investigation."
            : "Please enter at least one ratio and complete calculations above to activate this section."
        }
        className={`min-h-[120px] resize-y ${!isEnabled && 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-gray-950 text-gray-500 dark:text-gray-400'}`}
        disabled={!isEnabled}
      />
      {!isEnabled && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          This section will become active once you've entered and calculated at least one ratio.
        </p>
      )}
    </div>
  );
};