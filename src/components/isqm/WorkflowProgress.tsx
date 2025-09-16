import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Play, ArrowRight, Sparkles, FileText, TrendingUp } from 'lucide-react';

interface WorkflowProgressProps {
  activeTab: string;
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ activeTab }) => {
  return (
    <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
              activeTab === "questionnaire" 
                ? "bg-gray-800 text-white shadow-lg scale-105" 
                : "bg-white text-gray-600 shadow-md hover:shadow-lg"
              }`}>
              <Play className={`w-4 h-4 ${activeTab === "questionnaire" ? "text-white" : "text-gray-800"}`} />
              <div className="text-sm font-semibold">Questionnaire</div>
            </div>
            
            <ArrowRight className="w-4 h-4 text-gray-400" />
            
            <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
              activeTab === "policy-generator" 
                ? "bg-gray-800 text-white shadow-lg scale-105" 
                : "bg-white text-gray-600 shadow-md hover:shadow-lg"
              }`}>
              <Sparkles className={`w-4 h-4 ${activeTab === "policy-generator" ? "text-white" : "text-gray-800"}`} />
              <div className="text-sm font-semibold">Policies</div>
            </div>
            
            <ArrowRight className="w-4 h-4 text-gray-400" />
            
            <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
              activeTab === "documents" 
                ? "bg-gray-800 text-white shadow-lg scale-105" 
                : "bg-white text-gray-600 shadow-md hover:shadow-lg"
            }`}>
              <FileText className={`w-4 h-4 ${activeTab === "documents" ? "text-white" : "text-gray-800"}`} />
              <div className="text-sm font-semibold">Documents</div>
            </div>
            
            <ArrowRight className="w-4 h-4 text-gray-400" />
            
            <div className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
              activeTab === "analytics" 
                ? "bg-gray-800 text-white shadow-lg scale-105" 
                : "bg-white text-gray-600 shadow-md hover:shadow-lg"
            }`}>
              <TrendingUp className={`w-4 h-4 ${activeTab === "analytics" ? "text-white" : "text-gray-800"}`} />
              <div className="text-sm font-semibold">Analytics</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-medium text-gray-800">
              {activeTab === "questionnaire" ? "Answer questions to proceed" : 
               activeTab === "policy-generator" ? "Generate policies from answers" :
               activeTab === "documents" ? "Manage supporting documents" :
               "View analytics and reports"}
            </div>
            <div className="text-xs text-gray-700 mt-1">
              Complete workflow: Questionnaire → Policies → Documents → Analytics
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
