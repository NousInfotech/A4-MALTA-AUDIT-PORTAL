import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Folder, File, Plus, Upload, Search, MoreVertical, Download, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface LibraryFolder {
  id: string;
  name: string;
  createdAt: string;
  documentsCount: number;
}

interface LibraryDocument {
  id: string;
  name: string;
  folderId: string;
  size: string;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

const mockFolders: LibraryFolder[] = [
  { id: '1', name: 'Audit Templates', createdAt: '2024-01-15', documentsCount: 12 },
  { id: '2', name: 'Regulatory Guidelines', createdAt: '2024-01-20', documentsCount: 8 },
  { id: '3', name: 'Client Agreements', createdAt: '2024-02-01', documentsCount: 15 }
];

const mockDocuments: LibraryDocument[] = [
  { id: '1', name: 'Financial Audit Checklist.pdf', folderId: '1', size: '2.3 MB', type: 'PDF', uploadedAt: '2024-01-16', uploadedBy: 'John Smith' },
  { id: '2', name: 'Internal Controls Assessment.docx', folderId: '1', size: '1.8 MB', type: 'Word', uploadedAt: '2024-01-18', uploadedBy: 'Sarah Johnson' },
  { id: '3', name: 'SOX Compliance Guide.pdf', folderId: '2', size: '4.1 MB', type: 'PDF', uploadedAt: '2024-01-22', uploadedBy: 'Mike Wilson' }
];

export const Library = () => {
  const [folders, setFolders] = useState<LibraryFolder[]>(mockFolders);
  const [documents, setDocuments] = useState<LibraryDocument[]>(mockDocuments);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDocuments = documents.filter(doc =>
    (!selectedFolder || doc.folderId === selectedFolder) &&
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: LibraryFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      createdAt: new Date().toISOString().split('T')[0],
      documentsCount: 0
    };
    
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
  };

  const uploadDocument = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedFolder) return;

    Array.from(files).forEach(file => {
      const newDoc: LibraryDocument = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        folderId: selectedFolder,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        type: file.type.includes('pdf') ? 'PDF' : file.type.includes('word') ? 'Word' : 'File',
        uploadedAt: new Date().toISOString().split('T')[0],
        uploadedBy: 'Current User'
      };
      
      setDocuments(prev => [...prev, newDoc]);
      setFolders(prev => prev.map(folder =>
        folder.id === selectedFolder
          ? { ...folder, documentsCount: folder.documentsCount + 1 }
          : folder
      ));
    });
    
    setIsUploadOpen(false);
  };

  const deleteFolder = (folderId: string) => {
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setDocuments(prev => prev.filter(d => d.folderId !== folderId));
    if (selectedFolder === folderId) {
      setSelectedFolder(null);
    }
  };

  const deleteDocument = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setFolders(prev => prev.map(folder =>
        folder.id === doc.folderId
          ? { ...folder, documentsCount: Math.max(0, folder.documentsCount - 1) }
          : folder
      ));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Document Library</h1>
          <p className="text-muted-foreground mt-1">
            Organize and manage your audit documents and templates
          </p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                    Create Folder
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {selectedFolder && (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Documents</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <input
                    type="file"
                    multiple
                    onChange={uploadDocument}
                    className="w-full p-2 border border-input rounded-md"
                  />
                  <p className="text-sm text-muted-foreground">
                    Select one or more files to upload to the selected folder
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search folders and documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {selectedFolder && (
          <Button 
            variant="outline" 
            onClick={() => setSelectedFolder(null)}
          >
            Back to Folders
          </Button>
        )}
      </div>

      {!selectedFolder ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFolders.map((folder) => (
            <Card 
              key={folder.id} 
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedFolder(folder.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Folder className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold text-foreground">{folder.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {folder.documentsCount} documents
                    </p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFolder(folder.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="mt-3 text-xs text-muted-foreground">
                Created: {folder.createdAt}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              {folders.find(f => f.id === selectedFolder)?.name}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium text-foreground">{doc.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{doc.size}</span>
                        <Badge variant="secondary">{doc.type}</Badge>
                        <span>Uploaded by {doc.uploadedBy}</span>
                        <span>{doc.uploadedAt}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => deleteDocument(doc.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Document
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
            
            {filteredDocuments.length === 0 && (
              <div className="text-center py-12">
                <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'Upload some documents to get started'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};