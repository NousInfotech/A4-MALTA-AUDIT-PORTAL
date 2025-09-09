import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReviewNotes, ReviewNote } from '@/contexts/ReviewNotesContext';
import { 
  MessageSquare, 
  Search,
  Filter,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  FileText,
  Calendar,
  User,
  Tag,
  Eye,
  EyeOff
} from 'lucide-react';

interface ReviewNotesDashboardProps {
  engagementId?: string;
  className?: string;
}

export const ReviewNotesDashboard: React.FC<ReviewNotesDashboardProps> = ({ 
  engagementId,
  className = '' 
}) => {
  const { 
    reviewNotes, 
    getNotesByPage,
    getNotesByStatus,
    getNotesByPriority,
    getTotalNotesCount,
    getPendingNotesCount,
    getHighPriorityNotesCount
  } = useReviewNotes();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [showSignOffSummary, setShowSignOffSummary] = useState(false);

  // Get all unique pages
  const allPages = Array.from(new Set(reviewNotes.map(note => note.pageId)))
    .map(pageId => {
      const notes = getNotesByPage(pageId);
      return {
        id: pageId,
        name: notes[0]?.pageName || pageId,
        count: notes.length,
        pendingCount: notes.filter(n => n.status === 'pending').length,
        highPriorityCount: notes.filter(n => n.priority === 'high').length,
      };
    });

  // Filter notes based on search and filters
  const filteredNotes = reviewNotes.filter(note => {
    const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         note.pageName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || note.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || note.priority === priorityFilter;
    const matchesPage = pageFilter === 'all' || note.pageId === pageFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesPage;
  });

  // Group notes by page
  const notesByPage = allPages.map(page => ({
    ...page,
    notes: getNotesByPage(page.id).filter(note => {
      const matchesSearch = note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || note.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || note.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    })
  }));

  const getPriorityColor = (priority: ReviewNote['priority']) => {
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

  const getStatusColor = (status: ReviewNote['status']) => {
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

  const getPriorityIcon = (priority: ReviewNote['priority']) => {
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800">
                  Review Notes Dashboard
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Comprehensive view of all review notes across all pages
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowSignOffSummary(!showSignOffSummary)}
              variant="outline"
              className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 rounded-2xl px-4 py-2"
            >
              {showSignOffSummary ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              Sign-off Summary
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Notes</p>
                    <p className="text-2xl font-bold text-slate-800">{getTotalNotesCount()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Pending</p>
                    <p className="text-2xl font-bold text-slate-800">{getPendingNotesCount()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">High Priority</p>
                    <p className="text-2xl font-bold text-slate-800">{getHighPriorityNotesCount()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Pages</p>
                    <p className="text-2xl font-bold text-slate-800">{allPages.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-4 w-4" />
              <Input
                placeholder="Search notes, pages, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">Filters:</span>
              </div>
              
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-32 border-blue-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                <SelectTrigger className="w-32 border-blue-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={pageFilter} onValueChange={(value: any) => setPageFilter(value)}>
                <SelectTrigger className="w-48 border-blue-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pages</SelectItem>
                  {allPages.map(page => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.name} ({page.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="all-notes" className="space-y-6">
        <div className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50 p-6">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl p-1">
              <TabsTrigger 
                value="all-notes" 
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                All Notes ({filteredNotes.length})
              </TabsTrigger>
              <TabsTrigger 
                value="by-page" 
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <FileText className="h-4 w-4 mr-2" />
                By Page ({allPages.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="all-notes" className="space-y-4">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No Notes Found</h3>
                  <p className="text-slate-600">
                    {reviewNotes.length === 0 
                      ? "No review notes have been created yet."
                      : "No notes match your current filters."
                    }
                  </p>
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <Card key={note.id} className="bg-white/90 border border-blue-100/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-slate-800 leading-relaxed mb-2">{note.content}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <FileText className="h-3 w-3" />
                              <span className="font-medium">{note.pageName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className={`rounded-xl px-3 py-1 text-xs font-semibold ${getPriorityColor(note.priority)}`}>
                            <div className="flex items-center gap-1">
                              {getPriorityIcon(note.priority)}
                              {note.priority}
                            </div>
                          </Badge>
                          
                          <Badge className={`rounded-xl px-3 py-1 text-xs font-semibold ${getStatusColor(note.status)}`}>
                            {note.status}
                          </Badge>

                          {note.tags && note.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3 text-slate-500" />
                              <div className="flex gap-1">
                                {note.tags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs px-2 py-1 rounded-lg">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-blue-100/50">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {note.createdBy}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(note.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          {note.updatedAt !== note.createdAt && (
                            <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="by-page" className="space-y-6">
              {notesByPage.map((page) => (
                <Card key={page.id} className="bg-white/90 border border-blue-100/50 rounded-2xl shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-slate-800">{page.name}</CardTitle>
                          <p className="text-sm text-slate-600">
                            {page.count} notes • {page.pendingCount} pending • {page.highPriorityCount} high priority
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    {page.notes.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-600">No notes match your current filters for this page.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {page.notes.map((note) => (
                          <div key={note.id} className="p-3 bg-white rounded-xl border border-green-100 hover:border-green-200 transition-colors">
                            <div className="space-y-2">
                              <p className="text-slate-800 text-sm leading-relaxed">{note.content}</p>
                              <div className="flex items-center gap-2">
                                <Badge className={`rounded-lg px-2 py-1 text-xs font-semibold ${getPriorityColor(note.priority)}`}>
                                  <div className="flex items-center gap-1">
                                    {getPriorityIcon(note.priority)}
                                    {note.priority}
                                  </div>
                                </Badge>
                                <Badge className={`rounded-lg px-2 py-1 text-xs font-semibold ${getStatusColor(note.status)}`}>
                                  {note.status}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {note.createdBy} • {new Date(note.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Sign-off Summary */}
      {showSignOffSummary && (
        <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">
                  Sign-off Summary
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Overview of sign-off status across all pages
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Sign-off System Ready</h3>
              <p className="text-slate-600">
                The sign-off functionality is integrated into each page's review notes panel. 
                Click on individual pages to see the sign-off workflow.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
