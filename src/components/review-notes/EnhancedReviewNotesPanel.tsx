import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useReviewNotes, ReviewNote } from "@/contexts/ReviewNotesContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  Tag,
  Calendar,
  User,
  Shield,
  Users,
  FileCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PbcDialog from "../pbc/PbcDialog";

interface SignOff {
  id: string;
  userId: string;
  userName: string;
  userRole: "junior" | "senior" | "partner" | "manager";
  signedAt: string;
  status: "pending" | "signed" | "rejected";
  comments?: string;
}

interface PageSignOff {
  pageId: string;
  pageName: string;
  status: "not-started" | "in-progress" | "completed";
  signOffs: SignOff[];
  completedBy: string[];
  lastUpdated: string;
}

interface EnhancedReviewNotesPanelProps {
  pageId: string;
  pageName: string;
  className?: string;
  showSignOff?: boolean;
  engagementId?: string;
  selectedEngagement?: any;
}

export const EnhancedReviewNotesPanel: React.FC<
  EnhancedReviewNotesPanelProps
> = ({
  pageId,
  pageName,
  className = "",
  showSignOff = true,
  engagementId,
  selectedEngagement,
}) => {
  const { user } = useAuth();
  const {
    reviewNotes,
    addReviewNote,
    updateReviewNote,
    deleteReviewNote,
    getNotesByPage,
  } = useReviewNotes();
  const { toast } = useToast();

  const [isPBCModalOpen, setIsPBCModalOpen] = useState<boolean>(false);

  const onClosePBC = () => {
    setIsPBCModalOpen(false);
  };

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "in-progress" | "completed"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "low" | "medium" | "high"
  >("all");
  const [showSignOffPanel, setShowSignOffPanel] = useState(false);

  const [newNote, setNewNote] = useState({
    content: "",
    priority: "medium" as ReviewNote["priority"],
    status: "pending" as ReviewNote["status"],
    tags: [] as string[],
  });

  const [editingNote, setEditingNote] = useState({
    content: "",
    priority: "medium" as ReviewNote["priority"],
    status: "pending" as ReviewNote["status"],
    tags: [] as string[],
  });

  // Mock sign-off data - in real app, this would come from backend
  const [pageSignOffs, setPageSignOffs] = useState<PageSignOff>({
    pageId,
    pageName,
    status: "not-started",
    signOffs: [
      {
        id: "1",
        userId: "junior-1",
        userName: "Junior Auditor",
        userRole: "junior",
        signedAt: "",
        status: "pending",
      },
      {
        id: "2",
        userId: "senior-1",
        userName: "Senior Auditor",
        userRole: "senior",
        signedAt: "",
        status: "pending",
      },
      {
        id: "3",
        userId: "partner-1",
        userName: "Partner",
        userRole: "partner",
        signedAt: "",
        status: "pending",
      },
    ],
    completedBy: [],
    lastUpdated: new Date().toISOString(),
  });

  const pageNotes = getNotesByPage(pageId);

  const filteredNotes = pageNotes.filter((note) => {
    const matchesSearch =
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.tags?.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesStatus =
      statusFilter === "all" || note.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || note.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleAddNote = async () => {
    if (!newNote.content.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note content",
        variant: "destructive",
      });
      return;
    }

    try {
      await addReviewNote({
        pageId,
        pageName,
        content: newNote.content.trim(),
        priority: newNote.priority,
        status: newNote.status,
        createdBy: user?.name || "Unknown User",
        tags: newNote.tags,
      });

      setNewNote({
        content: "",
        priority: "medium",
        status: "pending",
        tags: [],
      });
      setIsAddingNote(false);

      toast({
        title: "Success",
        description: "Review note added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add review note",
        variant: "destructive",
      });
    }
  };

  const handleUpdateNote = async (id: string) => {
    if (!editingNote.content.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note content",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateReviewNote(id, {
        content: editingNote.content.trim(),
        priority: editingNote.priority,
        status: editingNote.status,
        tags: editingNote.tags,
      });

      setEditingNoteId(null);
      setEditingNote({
        content: "",
        priority: "medium",
        status: "pending",
        tags: [],
      });

      toast({
        title: "Success",
        description: "Review note updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update review note",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteReviewNote(id);
      toast({
        title: "Success",
        description: "Review note deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete review note",
        variant: "destructive",
      });
    }
  };

  const handleSignOff = (signOffId: string) => {
    const updatedSignOffs = pageSignOffs.signOffs.map((signOff) => {
      if (signOff.id === signOffId) {
        return {
          ...signOff,
          status: "signed" as const,
          signedAt: new Date().toISOString(),
        };
      }
      return signOff;
    });

    const completedBy = updatedSignOffs
      .filter((s) => s.status === "signed")
      .map((s) => s.userName);

    setPageSignOffs((prev) => ({
      ...prev,
      signOffs: updatedSignOffs,
      completedBy,
      status:
        completedBy.length === updatedSignOffs.length
          ? "completed"
          : "in-progress",
      lastUpdated: new Date().toISOString(),
    }));

    toast({
      title: "Sign-off Complete",
      description: "You have successfully signed off on this page",
    });
  };

  const startEditing = (note: ReviewNote) => {
    setEditingNoteId(note.id);
    setEditingNote({
      content: note.content,
      priority: note.priority,
      status: note.status,
      tags: note.tags || [],
    });
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingNote({
      content: "",
      priority: "medium",
      status: "pending",
      tags: [],
    });
  };

  const getPriorityColor = (priority: ReviewNote["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200";
      case "medium":
        return "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200";
      default:
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200";
    }
  };

  const getStatusColor = (status: ReviewNote["status"]) => {
    switch (status) {
      case "completed":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200";
      case "in-progress":
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200";
      case "pending":
        return "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200";
    }
  };

  const getPriorityIcon = (priority: ReviewNote["priority"]) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-3 w-3" />;
      case "medium":
        return <Clock className="h-3 w-3" />;
      case "low":
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getSignOffStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200";
      case "in-progress":
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200";
      case "not-started":
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200";
      default:
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "junior":
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200";
      case "senior":
        return "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200";
      case "partner":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200";
      case "manager":
        return "bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border-orange-200";
      default:
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Review Notes Panel */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">
                  Review Notes - {pageName}
                </CardTitle>
                <p className="text-sm text-slate-600">
                  {pageNotes.length} notes •{" "}
                  {pageNotes.filter((n) => n.status === "pending").length}{" "}
                  pending
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsPBCModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-2"
                size="sm"
              >
                PBF
              </Button>
              <Button
                onClick={() => setIsAddingNote(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-4 py-2"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
              {showSignOff && (
                <Button
                  onClick={() => setShowSignOffPanel(!showSignOffPanel)}
                  variant="outline"
                  className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 rounded-2xl px-4 py-2"
                  size="sm"
                >
                  {showSignOffPanel ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Sign-off
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-4 w-4" />
              <Input
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">
                  Filters:
                </span>
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value: any) => setStatusFilter(value)}
              >
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

              <Select
                value={priorityFilter}
                onValueChange={(value: any) => setPriorityFilter(value)}
              >
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
            </div>
          </div>

          {/* Add Note Form */}
          {isAddingNote && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter your review note..."
                  value={newNote.content}
                  onChange={(e) =>
                    setNewNote((prev) => ({ ...prev, content: e.target.value }))
                  }
                  className="min-h-[100px] bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl"
                />

                <div className="flex flex-wrap gap-3">
                  <Select
                    value={newNote.priority}
                    onValueChange={(value: any) =>
                      setNewNote((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger className="w-32 border-blue-200 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={newNote.status}
                    onValueChange={(value: any) =>
                      setNewNote((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="w-32 border-blue-200 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAddNote}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-4 py-2"
                    size="sm"
                  >
                    Add Note
                  </Button>
                  <Button
                    onClick={() => setIsAddingNote(false)}
                    variant="outline"
                    className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-2xl px-4 py-2"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Notes List */}
          <div className="space-y-4">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-slate-600 font-medium">
                  {pageNotes.length === 0
                    ? `No review notes for ${pageName} yet. Add your first note to get started.`
                    : "No notes match your current filters."}
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  className="bg-white/90 border border-blue-100/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <CardContent className="p-4">
                    {editingNoteId === note.id ? (
                      <div className="space-y-4">
                        <Textarea
                          value={editingNote.content}
                          onChange={(e) =>
                            setEditingNote((prev) => ({
                              ...prev,
                              content: e.target.value,
                            }))
                          }
                          className="min-h-[100px] bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl"
                        />

                        <div className="flex flex-wrap gap-3">
                          <Select
                            value={editingNote.priority}
                            onValueChange={(value: any) =>
                              setEditingNote((prev) => ({
                                ...prev,
                                priority: value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-32 border-blue-200 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low Priority</SelectItem>
                              <SelectItem value="medium">
                                Medium Priority
                              </SelectItem>
                              <SelectItem value="high">
                                High Priority
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={editingNote.status}
                            onValueChange={(value: any) =>
                              setEditingNote((prev) => ({
                                ...prev,
                                status: value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-32 border-blue-200 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">
                                In Progress
                              </SelectItem>
                              <SelectItem value="completed">
                                Completed
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleUpdateNote(note.id)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-4 py-2"
                            size="sm"
                          >
                            Save Changes
                          </Button>
                          <Button
                            onClick={cancelEditing}
                            variant="outline"
                            className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-2xl px-4 py-2"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <p className="text-slate-800 leading-relaxed flex-1">
                            {note.content}
                          </p>
                          <div className="flex gap-2 ml-4">
                            <Button
                              onClick={() => startEditing(note)}
                              variant="outline"
                              size="sm"
                              className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-xl p-2"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteNote(note.id)}
                              variant="outline"
                              size="sm"
                              className="border-red-200 hover:bg-red-50/50 text-red-700 hover:text-red-800 rounded-xl p-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Badge
                            className={`rounded-xl px-3 py-1 text-xs font-semibold ${getPriorityColor(
                              note.priority
                            )}`}
                          >
                            <div className="flex items-center gap-1">
                              {getPriorityIcon(note.priority)}
                              {note.priority}
                            </div>
                          </Badge>

                          <Badge
                            className={`rounded-xl px-3 py-1 text-xs font-semibold ${getStatusColor(
                              note.status
                            )}`}
                          >
                            {note.status}
                          </Badge>

                          {note.tags && note.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3 text-slate-500" />
                              <div className="flex gap-1">
                                {note.tags.map((tag, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-xs px-2 py-1 rounded-lg"
                                  >
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
                            <span>
                              Updated{" "}
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sign-off Panel */}
      {showSignOff && showSignOffPanel && (
        <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">
                  Sign-off - {pageName}
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Complete sign-off workflow for this page
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Page Status */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <FileCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Page Status</h3>
                  <p className="text-sm text-slate-600">
                    Current completion status
                  </p>
                </div>
              </div>
              <Badge
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${getSignOffStatusColor(
                  pageSignOffs.status
                )}`}
              >
                {pageSignOffs.status.replace("-", " ")}
              </Badge>
            </div>

            {/* Sign-off Workflow */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Sign-off Workflow
              </h4>

              <div className="space-y-3">
                {pageSignOffs.signOffs.map((signOff, index) => (
                  <div
                    key={signOff.id}
                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-purple-100 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <h5 className="font-semibold text-slate-800">
                            {signOff.userName}
                          </h5>
                          <Badge
                            className={`text-xs px-2 py-1 rounded-lg ${getRoleColor(
                              signOff.userRole
                            )}`}
                          >
                            {signOff.userRole}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {signOff.status === "signed" ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Signed</span>
                          <span className="text-xs text-slate-500">
                            {new Date(signOff.signedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleSignOff(signOff.id)}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-4 py-2"
                          size="sm"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Sign Off
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Completion Summary */}
            {pageSignOffs.completedBy.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">
                  Completed By:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {pageSignOffs.completedBy.map((name, index) => (
                    <Badge
                      key={index}
                      className="bg-green-100 text-green-800 border-green-200"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-green-700 mt-2">
                  Last updated:{" "}
                  {new Date(pageSignOffs.lastUpdated).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isPBCModalOpen && (
        <PbcDialog
          selectedEngagement={selectedEngagement}
          open={isPBCModalOpen}
          onOpenChange={setIsPBCModalOpen}
          onClosePBC={onClosePBC}
        />
      )}
    </div>
  );
};
