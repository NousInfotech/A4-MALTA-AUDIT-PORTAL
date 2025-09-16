import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';

interface ProgressSectionProps {
  progress: number;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({ progress }) => {
  return (
    <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-gray-800" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Assessment Progress</h3>
              <p className="text-sm text-gray-700">Track your questionnaire completion</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-800">{Math.round(progress)}%</div>
            <div className="text-sm text-gray-700">Complete</div>
          </div>
        </div>
        
        <div className="space-y-3">
          <Progress value={progress} className="h-3 bg-gray-200" />
          <div className="flex justify-between text-sm text-gray-700">
            <span>Started</span>
            <span>In Progress</span>
            <span>Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
