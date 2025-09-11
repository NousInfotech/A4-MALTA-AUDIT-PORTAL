import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, MessageSquare, AlertTriangle, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { QnACategory, QnAQuestion } from '@/types/pbc';

import { QuestionDiscussion } from './QuestionDiscussion';
import { pbcApi } from '@/lib/api/pbc-workflow';

interface CategoryManagerProps {
  pbcId: string;
  categories: QnACategory[];
  userRole: 'employee' | 'client' | 'admin';
  onUpdate: () => void;
  workflowStatus: string;
}

export function CategoryManager({ pbcId, categories, userRole, onUpdate, workflowStatus }: CategoryManagerProps) {
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionMandatory, setNewQuestionMandatory] = useState(false);
  const [showCreateQuestion, setShowCreateQuestion] = useState<string | null>(null);

  const canEdit = userRole === 'employee' || userRole === 'admin';
  const canAnswer = userRole === 'client' || userRole === 'admin';

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryTitle.trim()) return;

    try {
      await pbcApi.createCategory({
        pbcId,
        title: newCategoryTitle.trim(),
      });
      setNewCategoryTitle('');
      setShowCreateCategory(false);
      onUpdate();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleAddQuestion = async (categoryId: string) => {
    if (!newQuestionText.trim()) return;

    try {
      await pbcApi.addQuestionToCategory(categoryId, {
        question: newQuestionText.trim(),
        isMandatory: newQuestionMandatory,
      });
      setNewQuestionText('');
      setNewQuestionMandatory(false);
      setShowCreateQuestion(null);
      onUpdate();
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const handleAnswerQuestion = async (categoryId: string, questionIndex: number, answer: string) => {
    try {
      await pbcApi.updateQuestion(categoryId, questionIndex, {
        status: 'answered',
        answer,
      });
      onUpdate();
    } catch (error) {
      console.error('Error answering question:', error);
    }
  };

  const handleMarkDoubt = async (categoryId: string, questionIndex: number, doubtReason: string) => {
    try {
      await pbcApi.updateQuestion(categoryId, questionIndex, {
        status: 'doubt',
        doubtReason,
      });
      onUpdate();
    } catch (error) {
      console.error('Error marking doubt:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category and all its questions?')) {
      return;
    }

    try {
      await pbcApi.deleteCategory(categoryId);
      onUpdate();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'answered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'doubt':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered':
        return 'bg-green-500';
      case 'doubt':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Q&A Categories</h2>
        {canEdit && workflowStatus === 'qna-preparation' && (
          <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
            <DialogTrigger asChild>
              <button className="px-4 py-2 rounded-lg flex items-center gap-2 bg-indigo-500 hover:brightness-110">
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <Input
                  placeholder="Category title"
                  value={newCategoryTitle}
                  onChange={(e) => setNewCategoryTitle(e.target.value)}
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateCategory(false)}
                  >
                    Cancel
                  </Button>
                  <button type="submit" className='px-4 py-2 rounded-md bg-indigo-500 hover:brightness-110'>Create Category</button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
            <p className="text-gray-600">
              {canEdit ? 'Create your first Q&A category to get started' : 'No Q&A categories have been created yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {categories.map((category) => (
            <AccordionItem key={category._id} value={category._id}>
              <Card>
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold">{category.title}</h3>
                      <Badge variant="outline">
                        {category.qnaQuestions.length} question{category.qnaQuestions.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {category.qnaQuestions.filter(q => q.status === 'answered').length} answered
                      </span>
                      {category.qnaQuestions.some(q => q.status === 'doubt') && (
                        <Badge className="bg-red-500 text-white">
                          {category.qnaQuestions.filter(q => q.status === 'doubt').length} doubts
                        </Badge>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category._id);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-6 pb-6 space-y-4">
                    {category.qnaQuestions.map((question, index) => (
                      <QuestionCard
                        key={index}
                        question={question}
                        questionIndex={index}
                        categoryId={category._id}
                        canAnswer={canAnswer}
                        onAnswerQuestion={handleAnswerQuestion}
                        onMarkDoubt={handleMarkDoubt}
                        onDiscussionUpdate={onUpdate}
                      />
                    ))}

                    {canEdit && workflowStatus === 'qna-preparation' && (
                      <div className="pt-4 border-t">
                        {showCreateQuestion === category._id ? (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Enter your question"
                              value={newQuestionText}
                              onChange={(e) => setNewQuestionText(e.target.value)}
                              rows={3}
                            />
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`mandatory-${category._id}`}
                                checked={newQuestionMandatory}
                                onCheckedChange={(checked) => setNewQuestionMandatory(!!checked)}
                              />
                              <label htmlFor={`mandatory-${category._id}`} className="text-sm">
                                Mandatory question
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <Button
                              className='bg-indigo-500 hover:brightness-110'
                                size="sm"
                                onClick={() => handleAddQuestion(category._id)}
                              >
                                Add Question
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setShowCreateQuestion(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            
                           
                            onClick={() => setShowCreateQuestion(category._id)}
                            className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 bg-indigo-500 hover:brightness-110"
                          >
                            <Plus className="h-4 w-4" />
                            Add Question
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

interface QuestionCardProps {
  question: QnAQuestion;
  questionIndex: number;
  categoryId: string;
  canAnswer: boolean;
  onAnswerQuestion: (categoryId: string, questionIndex: number, answer: string) => void;
  onMarkDoubt: (categoryId: string, questionIndex: number, doubtReason: string) => void;
  onDiscussionUpdate: () => void;
}

function QuestionCard({
  question,
  questionIndex,
  categoryId,
  canAnswer,
  onAnswerQuestion,
  onMarkDoubt,
  onDiscussionUpdate,
}: QuestionCardProps) {
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answer, setAnswer] = useState(question.answer || '');
  const [showDoubtForm, setShowDoubtForm] = useState(false);
  const [doubtReason, setDoubtReason] = useState('');

  const handleSubmitAnswer = () => {
    if (answer.trim()) {
      onAnswerQuestion(categoryId, questionIndex, answer.trim());
      setShowAnswerForm(false);
    }
  };

  const handleSubmitDoubt = () => {
    if (doubtReason.trim()) {
      onMarkDoubt(categoryId, questionIndex, doubtReason.trim());
      setShowDoubtForm(false);
      setDoubtReason('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'answered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'doubt':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="border-l-4 border-l-gray-200">
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(question.status)}
                <span className="text-sm font-medium capitalize">{question.status}</span>
                {question.isMandatory && (
                  <Badge variant="destructive" className="text-xs">
                    Mandatory
                  </Badge>
                )}
              </div>
              <p className="text-gray-900 font-medium">{question.question}</p>
            </div>
          </div>

          {question.status === 'answered' && question.answer && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-1">Answer:</p>
              <p className="text-green-700">{question.answer}</p>
              {question.answeredAt && (
                <p className="text-xs text-green-600 mt-2">
                  Answered on {new Date(question.answeredAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {question.status === 'doubt' && question.doubtReason && (
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-1">Doubt:</p>
              <p className="text-red-700">{question.doubtReason}</p>
            </div>
          )}

          {question.discussions && question.discussions.length > 0 && (
            <QuestionDiscussion
              categoryId={categoryId}
              questionIndex={questionIndex}
              discussions={question.discussions}
              onUpdate={onDiscussionUpdate}
            />
          )}

          {canAnswer && question.status !== 'answered' && (
            <div className="flex gap-2">
              {!showAnswerForm && !showDoubtForm && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setShowAnswerForm(true)}
                  >
                    Answer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDoubtForm(true)}
                  >
                    I have doubts
                  </Button>
                </>
              )}

              {showAnswerForm && (
                <div className="w-full space-y-2">
                  <Textarea
                    placeholder="Enter your answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSubmitAnswer}>
                      Submit Answer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAnswerForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {showDoubtForm && (
                <div className="w-full space-y-2">
                  <Textarea
                    placeholder="Describe your doubts or questions"
                    value={doubtReason}
                    onChange={(e) => setDoubtReason(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSubmitDoubt}>
                      Submit Doubt
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDoubtForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}