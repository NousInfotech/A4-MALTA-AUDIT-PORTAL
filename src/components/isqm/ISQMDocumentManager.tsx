import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Upload, 
  Download, 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Tag,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  AlertCircle,
  FileImage,
  File,
  FileSpreadsheet,
  FileVideo,
  Archive,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useISQM, ISQMSupportingDocument } from '@/hooks/useISQM';

interface ISQMDocumentManagerProps {
  parentId: string;
}

export const ISQMDocumentManager: React.FC<ISQMDocumentManagerProps> = ({ parentId }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const {
    supportingDocuments,
    loading,
    fetchSupportingDocuments,
    createSupportingDocument,
    updateSupportingDocument,
    deleteSupportingDocument,
    uploadDocumentFile,
    reviewSupportingDocument,
    addDocumentNote,
  } = useISQM();

  const [activeTab, setActiveTab] = useState<string>("documents");
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedDocument, setSelectedDocument] = useState<ISQMSupportingDocument | null>(null);

  // Form state for creating new documents
  const [newDocument, setNewDocument] = useState({
    category: "",
    title: "",
    description: "",
    priority: "medium",
    isMandatory: false,
    dueDate: "",
    tags: [] as string[],
    framework: "IFRS",
    jurisdiction: "UK"
  });

  // Load supporting documents when component mounts
  useEffect(() => {
    if (parentId) {
      console.log('🔄 ISQMDocumentManager: Loading supporting documents for parent:', parentId);
      fetchSupportingDocuments(parentId);
    }
  }, [parentId, fetchSupportingDocuments]);

  // Filter documents based on search and filters
  const filteredDocuments = supportingDocuments.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    const matchesCategory = filterCategory === "all" || doc.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get unique categories and statuses for filters
  const categories = Array.from(new Set(supportingDocuments.map(doc => doc.category)));
  const statuses = Array.from(new Set(supportingDocuments.map(doc => doc.status)));

  // Calculate statistics
  const stats = {
    total: supportingDocuments.length,
    pending: supportingDocuments.filter(doc => doc.status === 'pending').length,
    uploaded: supportingDocuments.filter(doc => doc.status === 'uploaded').length,
    reviewed: supportingDocuments.filter(doc => doc.status === 'reviewed').length,
    approved: supportingDocuments.filter(doc => doc.status === 'approved').length,
    rejected: supportingDocuments.filter(doc => doc.status === 'rejected').length,
    completionRate: supportingDocuments.length > 0 
      ? (supportingDocuments.filter(doc => doc.status === 'approved').length / supportingDocuments.length) * 100 
      : 0
  };

  // Auto-generate tags based on document content
  const generateAutoTags = (title: string, description: string, category: string): string[] => {
    const tags: string[] = [];
    
    // Add category-based tags
    tags.push(category.toLowerCase().replace(/\s+/g, '-'));
    
    // Add framework tags
    if (title.toLowerCase().includes('isqm') || description.toLowerCase().includes('isqm')) {
      tags.push('isqm');
    }
    if (title.toLowerCase().includes('isa') || description.toLowerCase().includes('isa')) {
      tags.push('isa');
    }
    if (title.toLowerCase().includes('ifrs') || description.toLowerCase().includes('ifrs')) {
      tags.push('ifrs');
    }
    
    // Add content-based tags
    const content = `${title} ${description}`.toLowerCase();
    if (content.includes('policy')) tags.push('policy');
    if (content.includes('procedure')) tags.push('procedure');
    if (content.includes('risk')) tags.push('risk-assessment');
    if (content.includes('compliance')) tags.push('compliance');
    if (content.includes('training')) tags.push('training');
    if (content.includes('audit')) tags.push('audit-evidence');
    if (content.includes('quality')) tags.push('quality-management');
    
    // Add priority-based tags
    if (content.includes('critical') || content.includes('urgent')) {
      tags.push('high-priority');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  };

  const handleCreateDocument = async () => {
    try {
      console.log('🔄 Creating supporting document:', newDocument);
      
      // Auto-generate tags
      const autoTags = generateAutoTags(newDocument.title, newDocument.description, newDocument.category);
      const allTags = [...new Set([...newDocument.tags, ...autoTags])];
      
      await createSupportingDocument({
        parentId,
        ...newDocument,
        tags: allTags,
        dueDate: newDocument.dueDate || undefined,
      });
      
      setIsCreatingDocument(false);
      setNewDocument({
        category: "",
        title: "",
        description: "",
        priority: "medium",
        isMandatory: false,
        dueDate: "",
        tags: [],
        framework: "IFRS",
        jurisdiction: "UK"
      });
    } catch (error) {
      console.error('❌ Failed to create document:', error);
    }
  };

  const handleFileUpload = async (documentId: string, file: File) => {
    setIsUploading(documentId);
    try {
      console.log('🔄 Uploading file:', file.name, 'to document:', documentId);
      await uploadDocumentFile(documentId, file);
    } catch (error) {
      console.error('❌ Failed to upload file:', error);
    } finally {
      setIsUploading(null);
    }
  };

  const handleReviewDocument = async (documentId: string, status: string, comments?: string) => {
    try {
      console.log('🔄 Reviewing document:', documentId, 'with status:', status);
      await reviewSupportingDocument(documentId, status, comments);
    } catch (error) {
      console.error('❌ Failed to review document:', error);
    }
  };

  const handleEditDocument = async (document: ISQMSupportingDocument) => {
    try {
      console.log('🔄 Editing document:', document._id);
      const newTitle = prompt('Enter new document title:', document.title);
      if (newTitle && newTitle !== document.title) {
        await updateSupportingDocument(document._id, { title: newTitle });
      }
    } catch (error) {
      console.error('❌ Failed to edit document:', error);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!isAdmin) {
      alert('Only administrators can delete documents.');
      return;
    }
    
    try {
      console.log('🔄 Deleting document:', documentId);
      if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
        await deleteSupportingDocument(documentId);
      }
    } catch (error) {
      console.error('❌ Failed to delete document:', error);
    }
  };

  const handleAddNote = async (documentId: string) => {
    try {
      console.log('🔄 Adding note to document:', documentId);
      const noteText = prompt('Enter note text:');
      if (noteText && noteText.trim()) {
        await addDocumentNote(documentId, { text: noteText });
      }
    } catch (error) {
      console.error('❌ Failed to add note:', error);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <File className="w-4 h-4 text-red-500" />;
    if (mimeType.includes('image')) return <FileImage className="w-4 h-4 text-blue-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    if (mimeType.includes('video')) return <FileVideo className="w-4 h-4 text-purple-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'uploaded': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'reviewed': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Document Management</h2>
          <p className="text-gray-600">Upload, manage, and track supporting documents</p>
        </div>
        <Button 
          onClick={() => setIsCreatingDocument(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Request Document
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Documents</p>
                <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Approved</p>
                <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-yellow-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Completion Rate</p>
                <p className="text-2xl font-bold text-purple-800">{stats.completionRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-gray-200 focus:border-blue-400 rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border-2 border-gray-200 focus:border-blue-400 rounded-xl px-3 py-2"
              >
                <option value="all">All Status</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border-2 border-gray-200 focus:border-blue-400 rounded-xl px-3 py-2"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Document Dialog */}
      {isCreatingDocument && (
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-xl">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Request Supporting Document</h3>
                  <p className="text-sm text-muted-foreground">Create a new document request</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsCreatingDocument(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={newDocument.category}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border-2 border-gray-200 focus:border-blue-400 rounded-xl px-3 py-2"
                >
                  <option value="">Select Category</option>
                  <option value="Policy Documents">Policy Documents</option>
                  <option value="Training Records">Training Records</option>
                  <option value="Audit Evidence">Audit Evidence</option>
                  <option value="Risk Assessments">Risk Assessments</option>
                  <option value="Compliance Checklists">Compliance Checklists</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={newDocument.priority}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full border-2 border-gray-200 focus:border-blue-400 rounded-xl px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <Input
                value={newDocument.title}
                onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Document title..."
                className="border-2 border-gray-200 focus:border-blue-400 rounded-xl"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <Textarea
                value={newDocument.description}
                onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Document description..."
                className="border-2 border-gray-200 focus:border-blue-400 rounded-xl"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <Input
                  type="date"
                  value={newDocument.dueDate}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="border-2 border-gray-200 focus:border-blue-400 rounded-xl"
                />
              </div>
              <div className="flex items-center space-x-2 mt-6">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={newDocument.isMandatory}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, isMandatory: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isMandatory" className="text-sm font-medium text-gray-700">
                  Mandatory Document
                </label>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleCreateDocument}
                className="bg-green-500 hover:bg-green-600 text-white"
                disabled={!newDocument.category || !newDocument.title}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Request
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsCreatingDocument(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-blue-100 rounded-full">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Documents Found</h3>
                  <p className="text-gray-600 mb-4">Create your first document request to get started.</p>
                  <Button 
                    onClick={() => setIsCreatingDocument(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Request Document
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((document) => (
            <Card key={document._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">{document.title}</h3>
                      <Badge className={getStatusColor(document.status)}>
                        {document.status}
                      </Badge>
                      <Badge className={getPriorityColor(document.priority)}>
                        {document.priority}
                      </Badge>
                      {document.isMandatory && (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3">{document.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        <span>{document.category}</span>
                      </div>
                      {document.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(document.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Requested by: {document.requestedBy}</span>
                      </div>
                    </div>
                    
                    {document.tags.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <div className="flex gap-1">
                          {document.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {/* File Upload */}
                    <div className="relative">
                      <input
                        type="file"
                        id={`upload-${document._id}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(document._id, file);
                        }}
                        className="hidden"
                        disabled={isUploading === document._id}
                      />
                      <label
                        htmlFor={`upload-${document._id}`}
                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                          isUploading === document._id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {isUploading === document._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Upload
                      </label>
                    </div>
                    
                    {/* Review Actions */}
                    {document.status === 'uploaded' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleReviewDocument(document._id, 'approved')}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReviewDocument(document._id, 'rejected')}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    
                    {/* View Documents */}
                    {document.documents.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDocument(document)}
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View ({document.documents.length})
                      </Button>
                    )}
                    
                    {/* Edit Document */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditDocument(document)}
                      className="text-xs hover:bg-blue-50"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    
                    {/* Delete Document */}
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteDocument(document._id)}
                        className="text-xs hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    )}
                    
                    {/* Add Note */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddNote(document._id)}
                      className="text-xs hover:bg-green-50"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Note
                    </Button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Completion</span>
                    <span>{document.completionPercentage}%</span>
                  </div>
                  <Progress value={document.completionPercentage} className="h-2" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
