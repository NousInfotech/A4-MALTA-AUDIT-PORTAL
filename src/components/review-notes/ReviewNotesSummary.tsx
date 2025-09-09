// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReviewNotes } from '@/contexts/ReviewNotesContext';
import { 
  MessageSquare, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Eye,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReviewNotesSummaryProps {
  className?: string;
}

export const ReviewNotesSummary: React.FC<ReviewNotesSummaryProps> = ({ className = '' }) => {
  const { 
    reviewNotes, 
    getPendingNotesCount, 
    getHighPriorityNotesCount,
    getTotalNotesCount 
  } = useReviewNotes();

  const pendingCount = getPendingNotesCount();
  const highPriorityCount = getHighPriorityNotesCount();
  const totalCount = getTotalNotesCount();

  // Get recent notes (last 5)
  const recentNotes = reviewNotes
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200';
      default:
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'low':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200';
      case 'in-progress':
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <Card className={`bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden ${className}`}>
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-800">Review Notes Summary</CardTitle>
              <p className="text-slate-600 text-sm">Your latest review notes across all pages</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            asChild 
            className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 rounded-2xl"
          >
            <Link to="/employee/review-notes">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
            <div className="flex items-center justify-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-semibold uppercase">Total</span>
            </div>
            <span className="text-2xl font-bold text-blue-700">{totalCount}</span>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-yellow-600 font-semibold uppercase">Pending</span>
            </div>
            <span className="text-2xl font-bold text-yellow-700">{pendingCount}</span>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-red-600 font-semibold uppercase">High Priority</span>
            </div>
            <span className="text-2xl font-bold text-red-700">{highPriorityCount}</span>
          </div>
        </div>

        {/* Recent Notes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Recent Notes</h3>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <TrendingUp className="h-4 w-4" />
              Latest 5
            </div>
          </div>

          {recentNotes.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-slate-600 font-medium">
                No review notes yet. Start adding notes to track your review progress.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  className="group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50/30 border border-blue-100/50 rounded-2xl hover:border-blue-300/50 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate group-hover:text-purple-700 transition-colors duration-300">
                      {note.pageName}
                    </p>
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`rounded-xl px-2 py-1 text-xs font-semibold ${getPriorityColor(note.priority)}`}>
                        <div className="flex items-center gap-1">
                          {getPriorityIcon(note.priority)}
                          {note.priority}
                        </div>
                      </Badge>
                      <Badge className={`rounded-xl px-2 py-1 text-xs font-semibold ${getStatusColor(note.status)}`}>
                        {note.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-slate-500">
                      <p>{new Date(note.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs">{note.createdBy}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      asChild 
                      className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 rounded-xl"
                    >
                      <Link to={`/employee/${note.pageId}`}>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t border-blue-100/50">
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 rounded-2xl"
            >
              <Link to="/employee/clients">
                <MessageSquare className="h-4 w-4 mr-2" />
                Client Notes
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 rounded-2xl"
            >
              <Link to="/employee/engagements">
                <MessageSquare className="h-4 w-4 mr-2" />
                Engagement Notes
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 rounded-2xl"
            >
              <Link to="/employee/library">
                <MessageSquare className="h-4 w-4 mr-2" />
                Library Notes
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
