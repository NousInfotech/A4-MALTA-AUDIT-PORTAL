import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Download, Sparkles } from 'lucide-react';
import { useISQM } from '@/hooks/useISQM';

interface QNAItem {
  question: string;
  answer: string;
  state: boolean;
}

export default function QNAGeneratorDemo() {
  const [qnaArray, setQnaArray] = useState<QNAItem[]>([
    { question: '', answer: '', state: false }
  ]);
  const [categoryName, setCategoryName] = useState('');
  const [firmDetails, setFirmDetails] = useState({
    size: 'mid-sized',
    jurisdiction: 'UK',
    specializations: ['audit', 'tax', 'advisory']
  });
  const [generatedDocuments, setGeneratedDocuments] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { generateDocumentsFromQNA, downloadGeneratedDocument } = useISQM();

  const addQNA = () => {
    setQnaArray([...qnaArray, { question: '', answer: '', state: false }]);
  };

  const removeQNA = (index: number) => {
    if (qnaArray.length > 1) {
      setQnaArray(qnaArray.filter((_, i) => i !== index));
    }
  };

  const updateQNA = (index: number, field: keyof QNAItem, value: string | boolean) => {
    const updated = [...qnaArray];
    updated[index] = { ...updated[index], [field]: value };
    setQnaArray(updated);
  };

  const handleGenerate = async () => {
    if (!categoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    const validQNAs = qnaArray.filter(qna => qna.question.trim() !== '');
    if (validQNAs.length === 0) {
      alert('Please add at least one question');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateDocumentsFromQNA({
        qnaArray: validQNAs,
        categoryName,
        firmDetails
      });
      setGeneratedDocuments(result);
    } catch (error) {
      console.error('Failed to generate documents:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      await downloadGeneratedDocument(filename);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <div className="w-8 h-8 bg-brand-hover rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            QNA to Policy/Procedure Generator
          </CardTitle>
          <CardDescription className="text-gray-700">
            Generate policy and procedure documents from a QNA array with category name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="categoryName">Category Name</Label>
            <Input
              id="categoryName"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g., Governance & Leadership"
            />
          </div>

          {/* Firm Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firmSize">Firm Size</Label>
              <Input
                id="firmSize"
                value={firmDetails.size}
                onChange={(e) => setFirmDetails({ ...firmDetails, size: e.target.value })}
                placeholder="mid-sized"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Input
                id="jurisdiction"
                value={firmDetails.jurisdiction}
                onChange={(e) => setFirmDetails({ ...firmDetails, jurisdiction: e.target.value })}
                placeholder="UK"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specializations">Specializations</Label>
              <Input
                id="specializations"
                value={firmDetails.specializations.join(', ')}
                onChange={(e) => setFirmDetails({ 
                  ...firmDetails, 
                  specializations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                placeholder="audit, tax, advisory"
              />
            </div>
          </div>

          {/* QNA Array */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Questions & Answers</Label>
              <Button onClick={addQNA} size="sm" variant="outline" className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>

            {qnaArray.map((qna, index) => (
              <Card key={index} className="p-4 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:bg-gray-100/80 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Question {index + 1}</Label>
                    {qnaArray.length > 1 && (
                      <Button
                        onClick={() => removeQNA(index)}
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-red-200 hover:bg-red-50 text-red-600 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <Textarea
                    value={qna.question}
                    onChange={(e) => updateQNA(index, 'question', e.target.value)}
                    placeholder="Enter your question here..."
                    rows={2}
                    className="border-gray-200 focus:border-gray-400 rounded-xl"
                  />

                  <Textarea
                    value={qna.answer}
                    onChange={(e) => updateQNA(index, 'answer', e.target.value)}
                    placeholder="Enter your answer here..."
                    rows={3}
                    className="border-gray-200 focus:border-gray-400 rounded-xl"
                  />

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`state-${index}`}
                      checked={qna.state}
                      onChange={(e) => updateQNA(index, 'state', e.target.checked)}
                      className="rounded border-gray-200 focus:border-gray-400"
                    />
                    <Label htmlFor={`state-${index}`} className="text-sm text-gray-700">Implementation Status: Implemented</Label>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !categoryName.trim()}
            className="w-full bg-brand-hover hover:bg-brand-active text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Generating Documents...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Policy & Procedure Documents
              </>
            )}
          </Button>

          {/* Generated Documents */}
          {generatedDocuments && (
            <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
                <CardTitle className="text-gray-900">Documents Generated Successfully!</CardTitle>
                <CardDescription className="text-gray-700">
                  Generated documents for: {generatedDocuments.categoryName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Policy Document */}
                  <Card className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:bg-gray-100/80 transition-all duration-300">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Policy Document</h4>
                      <p className="text-sm text-gray-700 mb-3">
                        {generatedDocuments.documents.policy.pdfFilename}
                      </p>
                      <Button
                        onClick={() => handleDownload(generatedDocuments.documents.policy.pdfFilename)}
                        size="sm"
                        className="w-full bg-brand-hover hover:bg-brand-active text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Policy PDF
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Procedure Document */}
                  <Card className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:bg-gray-100/80 transition-all duration-300">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Procedure Document</h4>
                      <p className="text-sm text-gray-700 mb-3">
                        {generatedDocuments.documents.procedure.pdfFilename}
                      </p>
                      <Button
                        onClick={() => handleDownload(generatedDocuments.documents.procedure.pdfFilename)}
                        size="sm"
                        className="w-full bg-brand-hover hover:bg-brand-active text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Procedure PDF
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Metadata */}
                <div className="text-sm text-gray-600">
                  <p>Generated at: {new Date(generatedDocuments.metadata.generatedAt).toLocaleString()}</p>
                  <p>Total Questions: {generatedDocuments.metadata.totalQuestions}</p>
                  <p>Answered Questions: {generatedDocuments.metadata.answeredQuestions}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
