import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Plus, Trash2, Edit2, Check, ChevronDown, ChevronRight, AlertCircle, FileText, Save, Send, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  uploaded: boolean;
}

interface Question {
  id: string;
  text: string;
  mandatory: boolean;
  answer?: string;
  isDoubtful?: boolean;
  doubtfulReason?: string;
}

interface Category {
  id: string;
  name: string;
  questions: Question[];
}

interface FormData {
  clientName: string;
  auditPeriod: string;
  contactEmail: string;
  additionalNotes: string;
}

// Progress Bar Component
const ProgressBar: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    'Client Submission',
    'Question Generation', 
    'Auditor Verification',
    'Client Answering',
    'Completion'
  ];

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              index < currentStep 
                ? 'bg-green-500 border-green-500 text-white' 
                : index === currentStep 
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-gray-200 border-gray-300 text-gray-500'
            }`}>
              {index < currentStep ? <Check size={20} /> : index + 1}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              index === currentStep ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// File Upload Component
const FileUpload: React.FC<{
  files: any;
  onFilesChange: (files: any) => void;
}> = ({ files, onFilesChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFiles = (fileList: File[]) => {
    const newFiles = fileList.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      progress: 0,
      uploaded: false
    }));

    onFilesChange([...files, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach(file => {
      const interval = setInterval(() => {
        onFilesChange(prevFiles => 
          prevFiles.map(f => 
            f.id === file.id 
              ? { ...f, progress: Math.min(f.progress + 20, 100) }
              : f
          )
        );
      }, 200);

      setTimeout(() => {
        clearInterval(interval);
        onFilesChange(prevFiles => 
          prevFiles.map(f => 
            f.id === file.id 
              ? { ...f, progress: 100, uploaded: true }
              : f
          )
        );
      }, 1000);
    });
  };

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  };

  return (
    <div>
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-lg font-medium text-gray-700">
          Drag and drop files here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to select files
        </p>
        <Button 
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map(file => (
            <div key={file.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
              <FileText className="h-5 w-5 text-blue-500 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium">{file.name}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      file.uploaded ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="ml-2"
              >
                <X size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Step 1: Client Submission
const ClientSubmission: React.FC<{
  formData: FormData;
  files: any;
  onFormChange: (data: FormData) => void;
  onFilesChange: (files: any) => void;
  onNext: () => void;
}> = ({ formData, files, onFormChange, onFilesChange, onNext }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }
    if (!formData.auditPeriod.trim()) {
      newErrors.auditPeriod = 'Audit period is required';
    }
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    }
    if (files.length === 0) {
      newErrors.files = 'At least one file must be uploaded';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="mr-2" />
            File Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload files={files} onFilesChange={onFilesChange} />
          {errors.files && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.files}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => onFormChange({ ...formData, clientName: e.target.value })}
              className={errors.clientName ? 'border-red-500' : ''}
            />
            {errors.clientName && (
              <p className="text-sm text-red-600 mt-1">{errors.clientName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="auditPeriod">Audit Period *</Label>
            <Input
              id="auditPeriod"
              value={formData.auditPeriod}
              onChange={(e) => onFormChange({ ...formData, auditPeriod: e.target.value })}
              className={errors.auditPeriod ? 'border-red-500' : ''}
            />
            {errors.auditPeriod && (
              <p className="text-sm text-red-600 mt-1">{errors.auditPeriod}</p>
            )}
          </div>

          <div>
            <Label htmlFor="contactEmail">Contact Email *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => onFormChange({ ...formData, contactEmail: e.target.value })}
              className={errors.contactEmail ? 'border-red-500' : ''}
            />
            {errors.contactEmail && (
              <p className="text-sm text-red-600 mt-1">{errors.contactEmail}</p>
            )}
          </div>

          <div>
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => onFormChange({ ...formData, additionalNotes: e.target.value })}
              placeholder="Any additional information for the auditor..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled>
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        <Button onClick={handleSubmit}>
          Submit for Review
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Step 2: Question Generation
const QuestionGeneration: React.FC<{
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ categories, onCategoriesChange, onNext, onBack }) => {
  const [activeTab, setActiveTab] = useState('auditor');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const addCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: Math.random().toString(36).substr(2, 9),
        name: newCategoryName,
        questions: []
      };
      onCategoriesChange([...categories, newCategory]);
      setNewCategoryName('');
    }
  };

  const deleteCategory = (categoryId: string) => {
    onCategoriesChange(categories.filter(c => c.id !== categoryId));
  };

  const addQuestion = (categoryId: string) => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      text: '',
      mandatory: false
    };
    
    onCategoriesChange(categories.map(category =>
      category.id === categoryId
        ? { ...category, questions: [...category.questions, newQuestion] }
        : category
    ));
  };

  const updateQuestion = (categoryId: string, questionId: string, updates: Partial<Question>) => {
    onCategoriesChange(categories.map(category =>
      category.id === categoryId
        ? {
            ...category,
            questions: category.questions.map(q =>
              q.id === questionId ? { ...q, ...updates } : q
            )
          }
        : category
    ));
  };

  const deleteQuestion = (categoryId: string, questionId: string) => {
    onCategoriesChange(categories.map(category =>
      category.id === categoryId
        ? { ...category, questions: category.questions.filter(q => q.id !== questionId) }
        : category
    ));
  };

  const generateAIQuestions = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      const aiGeneratedCategories: Category[] = [
        {
          id: 'ai-1',
          name: 'Financial Position',
          questions: [
            {
              id: 'q1',
              text: 'What is the total cash and cash equivalents at year end?',
              mandatory: true
            },
            {
              id: 'q2',
              text: 'Provide details of any significant related party transactions.',
              mandatory: false
            }
          ]
        },
        {
          id: 'ai-2',
          name: 'Revenue Recognition',
          questions: [
            {
              id: 'q3',
              text: 'Describe your revenue recognition policies.',
              mandatory: true
            }
          ]
        }
      ];
      
      onCategoriesChange([...categories, ...aiGeneratedCategories]);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="auditor">Auditor-driven</TabsTrigger>
          <TabsTrigger value="ai">AI-driven</TabsTrigger>
        </TabsList>

        <TabsContent value="auditor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <Button onClick={addCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {categories.map(category => (
                  <Card key={category.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {category.questions.map(question => (
                        <div key={question.id} className="flex items-start gap-2 p-2 border rounded">
                          <div className="flex-1">
                            <Input
                              value={question.text}
                              onChange={(e) => updateQuestion(category.id, question.id, { text: e.target.value })}
                              placeholder="Enter question"
                            />
                            <div className="flex items-center mt-2">
                              <Checkbox
                                id={`mandatory-${question.id}`}
                                checked={question.mandatory}
                                onCheckedChange={(checked) => 
                                  updateQuestion(category.id, question.id, { mandatory: !!checked })
                                }
                              />
                              <Label htmlFor={`mandatory-${question.id}`} className="ml-2">
                                Mandatory
                              </Label>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(category.id, question.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addQuestion(category.id)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Question Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ai-prompt">AI Prompt</Label>
                <Textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe what kind of questions you need for this audit..."
                  rows={3}
                />
              </div>
              <Button 
                onClick={generateAIQuestions} 
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating Questions...
                  </>
                ) : (
                  'Generate Questions'
                )}
              </Button>
            </CardContent>
          </Card>

          {categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Edit Generated Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categories.map(category => (
                    <Card key={category.id} className="border-l-4 border-l-green-500">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {category.questions.map(question => (
                          <div key={question.id} className="flex items-start gap-2 p-2 border rounded">
                            <div className="flex-1">
                              <Input
                                value={question.text}
                                onChange={(e) => updateQuestion(category.id, question.id, { text: e.target.value })}
                                placeholder="Enter question"
                              />
                              <div className="flex items-center mt-2">
                                <Checkbox
                                  id={`mandatory-ai-${question.id}`}
                                  checked={question.mandatory}
                                  onCheckedChange={(checked) => 
                                    updateQuestion(category.id, question.id, { mandatory: !!checked })
                                  }
                                />
                                <Label htmlFor={`mandatory-ai-${question.id}`} className="ml-2">
                                  Mandatory
                                </Label>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteQuestion(category.id, question.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addQuestion(category.id)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Question
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button onClick={onNext}>
            Proceed to Verification
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Step 3: Auditor Verification
const AuditorVerification: React.FC<{
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ categories, onCategoriesChange, onNext, onBack }) => {
  const totalQuestions = categories.reduce((sum, cat) => sum + cat.questions.length, 0);
  const mandatoryQuestions = categories.reduce(
    (sum, cat) => sum + cat.questions.filter(q => q.mandatory).length, 
    0
  );

  const updateQuestion = (categoryId: string, questionId: string, updates: Partial<Question>) => {
    onCategoriesChange(categories.map(category =>
      category.id === categoryId
        ? {
            ...category,
            questions: category.questions.map(q =>
              q.id === questionId ? { ...q, ...updates } : q
            )
          }
        : category
    ));
  };

  const deleteQuestion = (categoryId: string, questionId: string) => {
    onCategoriesChange(categories.map(category =>
      category.id === categoryId
        ? { ...category, questions: category.questions.filter(q => q.id !== questionId) }
        : category
    ));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
              <p className="text-sm text-gray-600">Categories</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{totalQuestions}</p>
              <p className="text-sm text-gray-600">Total Questions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{mandatoryQuestions}</p>
              <p className="text-sm text-gray-600">Mandatory Questions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Final Review & Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map(category => (
              <Card key={category.id} className="border-l-4 border-l-purple-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {category.name}
                    <Badge variant="secondary">
                      {category.questions.length} questions
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.questions.map((question, index) => (
                    <div key={question.id} className="p-3 border rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-gray-500 mt-2">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <Input
                            value={question.text}
                            onChange={(e) => updateQuestion(category.id, question.id, { text: e.target.value })}
                            className="mb-2"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Checkbox
                                id={`verify-mandatory-${question.id}`}
                                checked={question.mandatory}
                                onCheckedChange={(checked) => 
                                  updateQuestion(category.id, question.id, { mandatory: !!checked })
                                }
                              />
                              <Label htmlFor={`verify-mandatory-${question.id}`} className="ml-2">
                                Mandatory
                              </Label>
                              {question.mandatory && (
                                <Badge variant="destructive" className="ml-2">*</Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteQuestion(category.id, question.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button onClick={onNext}>
            <Send className="mr-2 h-4 w-4" />
            Approve & Send to Client
          </Button>
        </div>
      </div>
    </div>
  );
};

// Step 4: Client Question Answering
const ClientAnswering: React.FC<{
  categories: Category[];
  onCategoriesChange: (categories: Category[]) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ categories, onCategoriesChange, onNext, onBack }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateAnswer = (categoryId: string, questionId: string, updates: Partial<Question>) => {
    onCategoriesChange(categories.map(category =>
      category.id === categoryId
        ? {
            ...category,
            questions: category.questions.map(q =>
              q.id === questionId ? { ...q, ...updates } : q
            )
          }
        : category
    ));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    categories.forEach(category => {
      category.questions.forEach(question => {
        if (question.mandatory && !question.answer?.trim()) {
          newErrors[question.id] = 'This mandatory question must be answered';
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onNext();
    }
  };

  let questionNumber = 1;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please answer all questions marked with an asterisk (*) as they are mandatory.
        </AlertDescription>
      </Alert>

      {categories.map(category => (
        <Card key={category.id} className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-xl">{category.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {category.questions.map(question => (
              <div key={question.id} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-500 mt-1">
                    {questionNumber++}.
                  </span>
                  <div className="flex-1">
                    <p className="font-medium mb-2">
                      {question.text}
                      {question.mandatory && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    <Textarea
                      value={question.answer || ''}
                      onChange={(e) => updateAnswer(category.id, question.id, { answer: e.target.value })}
                      placeholder="Enter your answer here..."
                      rows={3}
                      className={errors[question.id] ? 'border-red-500' : ''}
                    />
                    {errors[question.id] && (
                      <p className="text-sm text-red-600 mt-1">{errors[question.id]}</p>
                    )}
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center">
                        <Checkbox
                          id={`doubtful-${question.id}`}
                          checked={question.isDoubtful || false}
                          onCheckedChange={(checked) => 
                            updateAnswer(category.id, question.id, { isDoubtful: !!checked })
                          }
                        />
                        <Label htmlFor={`doubtful-${question.id}`} className="ml-2">
                          Mark as doubtful
                        </Label>
                      </div>
                      
                      {question.isDoubtful && (
                        <Textarea
                          value={question.doubtfulReason || ''}
                          onChange={(e) => updateAnswer(category.id, question.id, { doubtfulReason: e.target.value })}
                          placeholder="Please explain why you're uncertain about this answer..."
                          rows={2}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button onClick={handleSubmit}>
            <Send className="mr-2 h-4 w-4" />
            Submit Answers
          </Button>
        </div>
      </div>
    </div>
  );
};

// Step 5: Completion
const Completion: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <CheckCircle className="h-24 w-24 text-green-500" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">
          Submission Complete!
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Thank you! Your responses have been submitted successfully and are now awaiting auditor review. 
          You will receive a confirmation email shortly with the submission details.
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Submission ID:</span>
              <span className="font-mono">PBC-2024-001</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date Submitted:</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <Badge variant="secondary">Under Review</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          View Submission Details
        </Button>
        <Button variant="outline">
          Go to Dashboard
        </Button>
        <Button>
          Start New PBC
        </Button>
      </div>
    </div>
  );
};

// Main App Component
const PBCAuditWorkflow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    clientName: '',
    auditPeriod: '',
    contactEmail: '',
    additionalNotes: ''
  });
  const [files, setFiles] = useState<any>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ClientSubmission
            formData={formData}
            files={files}
            onFormChange={setFormData}
            onFilesChange={setFiles}
            onNext={nextStep}
          />
        );
      case 1:
        return (
          <QuestionGeneration
            categories={categories}
            onCategoriesChange={setCategories}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 2:
        return (
          <AuditorVerification
            categories={categories}
            onCategoriesChange={setCategories}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <ClientAnswering
            categories={categories}
            onCategoriesChange={setCategories}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return <Completion onBack={prevStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
            PBC Audit Workflow
          </h1>
          <p className="text-center text-gray-600">
            Streamlined process for Prepared by Client audit documentation
          </p>
        </div>

        <ProgressBar currentStep={currentStep} />
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default PBCAuditWorkflow;