import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  AlertCircle,
  Edit,
  Trash2,
  Download,
  Save,
  XCircle,
  CheckCircle,
  Clock,
  Loader2,
  Plus
} from 'lucide-react';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';
import { ISQMQuestionnaire } from '@/hooks/useISQM';

interface QuestionnaireTabProps {
  selectedParent: string;
  questionnaires: ISQMQuestionnaire[];
  loading: boolean;
  expandedSections: Set<string>;
  expandedCategories: Set<string>;
  localAnswers: Map<string, string>;
  localStates: Map<string, boolean>;
  pendingSaves: Set<string>;
  savingAnswers: Set<string>;
  isAdmin: boolean;
  onToggleCategory: (categoryKey: string) => void;
  onToggleSection: (sectionKey: string) => void;
  onAnswerUpdate: (questionnaireId: string, sectionIndex: number, questionIndex: number, answer: string) => void;
  onStateUpdate: (questionnaireId: string, sectionIndex: number, questionIndex: number, state: boolean) => void;
  onEditQuestionnaire: (questionnaire: ISQMQuestionnaire) => void;
  onDeleteQuestionnaire: (questionnaireId: string) => void;
  onExportQuestionnaire: (questionnaireId: string) => void;
  onEditSectionHeading: (questionnaireId: string, sectionIndex: number, currentHeading: string) => void;
  onDeleteSection: (questionnaireId: string, sectionIndex: number, sectionHeading: string) => void;
  onAddSectionNote: (questionnaireId: string, sectionIndex: number) => void;
  onSaveSection: (questionnaireId: string, sectionIndex: number) => void;
  onCreateNewPack: () => void;
}

export const QuestionnaireTab: React.FC<QuestionnaireTabProps> = ({
  selectedParent,
  questionnaires,
  loading,
  expandedSections,
  expandedCategories,
  localAnswers,
  localStates,
  pendingSaves,
  savingAnswers,
  isAdmin,
  onToggleCategory,
  onToggleSection,
  onAnswerUpdate,
  onStateUpdate,
  onEditQuestionnaire,
  onDeleteQuestionnaire,
  onExportQuestionnaire,
  onEditSectionHeading,
  onDeleteSection,
  onAddSectionNote,
  onSaveSection,
  onCreateNewPack
}) => {
  if (!selectedParent) {
    return (
      <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <FileText className="w-8 h-8 text-gray-800" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No ISQM Pack Selected</h3>
              <p className="text-gray-700 mb-4">Please select an existing ISQM pack or create a new one to start working on questionnaires.</p>
              <Button 
                onClick={onCreateNewPack}
                className="bg-gray-800 hover:bg-gray-900 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Pack
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader variant="pulse" size="lg" text="Loading questionnaires..." />
      </div>
    );
  }

  if (questionnaires.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-yellow-100 rounded-full">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Questionnaires Found</h3>
              <p className="text-gray-700">This ISQM pack doesn't have any questionnaires yet.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {questionnaires.map((questionnaire) => (
        <Card key={questionnaire._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl hover:bg-white/70 shadow-lg shadow-gray-300/30">
          <CardHeader className="pb-4">
            <CardTitle 
              className="flex items-center justify-between cursor-pointer group hover:bg-gray-100/50 p-4 rounded-2xl transition-all duration-300"
              onClick={() => onToggleCategory(questionnaire._id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-2xl flex items-center justify-center text-sm font-bold shadow-lg">
                  L1
                </div>
                <div>
                  <span className="text-xl font-semibold text-gray-900">{questionnaire.heading}</span>
                  <div className="text-sm text-gray-700 mt-1">
                    {questionnaire.sections.length} sections • {questionnaire.stats.totalQuestions} questions
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                  {questionnaire.stats.answeredQuestions} answered
                </Badge>
                <Badge variant="outline" className={`${
                  questionnaire.status === 'completed' ? 'bg-gray-800 text-white border-gray-800' :
                  questionnaire.status === 'in-progress' ? 'bg-gray-600 text-white border-gray-600' :
                  'bg-gray-400 text-white border-gray-400'
                }`}>
                  {questionnaire.status}
                </Badge>
                
                {/* CRUD Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditQuestionnaire(questionnaire);
                    }}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4 text-gray-800" />
                  </Button>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteQuestionnaire(questionnaire._id);
                      }}
                      className="h-8 w-8 p-0 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportQuestionnaire(questionnaire._id);
                    }}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <Download className="w-4 h-4 text-gray-800" />
                  </Button>
                </div>
                
                {expandedCategories.has(questionnaire._id) ? (
                  <ChevronDown className="w-6 h-6 text-gray-800 group-hover:scale-110 transition-transform duration-300" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:scale-110 transition-transform duration-300" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
          {expandedCategories.has(questionnaire._id) && (
            <CardContent className="space-y-4">
              {questionnaire.sections.map((section, sectionIdx) => {
                const sectionKey = `${questionnaire._id}-${sectionIdx}`;
                return (
                  <Card key={sectionIdx} className="border-l-4 border-l-gray-800 shadow-md hover:shadow-lg transition-all duration-300 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl hover:bg-white/70 shadow-lg shadow-gray-300/30">
                    <CardHeader className="pb-3">
                      <CardTitle 
                        className="text-lg flex items-center justify-between cursor-pointer group hover:bg-gray-100/50 p-3 rounded-xl transition-all duration-300"
                        onClick={() => onToggleSection(sectionKey)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-xl flex items-center justify-center text-xs font-bold shadow-md">
                            L2
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">{section.heading}</span>
                            <div className="text-xs text-gray-700 mt-1">
                              {section.qna.filter(q => q.answer.trim() !== "").length} of {section.qna.length} answered
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                            {section.qna.length} Questions
                          </Badge>
                          {/* Section CRUD Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSectionHeading(questionnaire._id, sectionIdx, section.heading);
                              }}
                              className="h-7 w-7 p-0 hover:bg-gray-100"
                            >
                              <Edit className="w-3 h-3 text-gray-800" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSection(questionnaire._id, sectionIdx, section.heading);
                                }}
                                className="h-7 w-7 p-0 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddSectionNote(questionnaire._id, sectionIdx);
                              }}
                              className="h-7 w-7 p-0 hover:bg-gray-100"
                            >
                              <Edit className="w-3 h-3 text-gray-800" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Clear all answers in this section?')) {
                                  section.qna.forEach((q, qIdx) => {
                                    onAnswerUpdate(questionnaire._id, sectionIdx, qIdx, '');
                                  });
                                }
                              }}
                              className="h-7 w-7 p-0 hover:bg-orange-50"
                            >
                              <XCircle className="w-3 h-3 text-orange-600" />
                            </Button>
                            {/* Save Section Button */}
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSaveSection(questionnaire._id, sectionIdx);
                              }}
                              className="h-7 px-3 bg-gray-800 hover:bg-gray-900 text-white"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                          </div>
                          {expandedSections.has(sectionKey) ? (
                            <ChevronDown className="w-5 h-5 text-gray-800 group-hover:scale-110 transition-transform duration-300" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform duration-300" />
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    {expandedSections.has(sectionKey) && (
                      <CardContent className="space-y-4">
                        {section.qna.map((q, questionIdx) => {
                          const answerKey = `${questionnaire._id}-${sectionIdx}-${questionIdx}`;
                          const isSaving = savingAnswers.has(answerKey);
                          
                          return (
                            <Card key={questionIdx} className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  <div className="flex items-start gap-4">
                                    <div className="flex-1 space-y-3">
                                      <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-md flex-shrink-0 mt-1">
                                          L3
                                        </div>
                                        <div className="flex-1">
                                          <p className="font-semibold text-gray-900 leading-relaxed">
                                            Q{questionIdx + 1}: {q.question}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="relative">
                                        <Textarea
                                          placeholder="Enter your detailed answer here..."
                                          value={localAnswers.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.answer}
                                          onChange={(e) => onAnswerUpdate(questionnaire._id, sectionIdx, questionIdx, e.target.value)}
                                          className="min-h-[100px] border-2 border-gray-200 focus:border-gray-400 rounded-xl resize-none transition-colors duration-300 bg-white/80 backdrop-blur-sm"
                                        />
                                        {(savingAnswers.has(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) || pendingSaves.has(`${questionnaire._id}-${sectionIdx}-${questionIdx}`)) && (
                                          <div className="absolute top-2 right-2">
                                            <Loader2 className="w-4 h-4 text-gray-800 animate-spin" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-3 min-w-[200px]">
                                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200">
                                          <div className="flex items-center space-x-3 mb-3">
                                            <Checkbox
                                              id={`implemented-${questionnaire._id}-${sectionIdx}-${questionIdx}`}
                                              checked={localStates.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.state}
                                              onCheckedChange={(checked) => onStateUpdate(questionnaire._id, sectionIdx, questionIdx, checked as boolean)}
                                              className="data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800"
                                            />
                                            <label 
                                              htmlFor={`implemented-${questionnaire._id}-${sectionIdx}-${questionIdx}`}
                                              className="text-sm font-semibold text-gray-800 cursor-pointer"
                                            >
                                              Implementation Status
                                            </label>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {(localStates.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.state) ? (
                                              <CheckCircle className="w-5 h-5 text-gray-800" />
                                            ) : (
                                              <XCircle className="w-5 h-5 text-red-500" />
                                            )}
                                            <span className={`text-sm font-medium ${(localStates.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.state) ? "text-gray-800" : "text-red-600"}`}>
                                              {(localStates.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.state) ? "Implemented" : "Not Implemented"}
                                            </span>
                                          </div>
                                        </div>
                                      
                                      {(localAnswers.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.answer).trim() !== "" && (
                                        <div className="bg-gray-100 rounded-xl p-3 border border-gray-200">
                                          <div className="flex items-center gap-2 text-gray-800">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-xs font-medium">Answer Length: {(localAnswers.get(`${questionnaire._id}-${sectionIdx}-${questionIdx}`) ?? q.answer).length} characters</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};
