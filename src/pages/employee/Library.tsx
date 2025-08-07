import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Folder, File, Plus, Upload, Search, MoreVertical, Download, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface LibraryFolder {
  name: string;
  path: string; // folder prefix
  createdAt: string;
  documentsCount: number;
}

interface LibraryDocument {
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export const Library = () => {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const bucket = 'engagement-documents';

  // Fetch folders by listing top-level prefixes
  const fetchFolders = async () => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: 100, offset: 0, search: '' });
    if (error) {
      console.error('Error fetching folders:', error);
      return;
    }
    // Filter to directories (prefixes)
    const prefixes = data.filter(item => item.name.endsWith('/'));
    const folderList = prefixes.map(pref => ({
      name: pref.name.replace(/\/$/, ''),
      path: pref.name,
      createdAt: new Date(pref.created_at).toISOString().split('T')[0],
      documentsCount: pref.size || 0
    }));
    setFolders(folderList);
  };

  // Fetch documents for selected folder
  const fetchDocuments = async (folderPath: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folderPath, { limit: 100, offset: 0 });
    if (error) {
      console.error('Error fetching documents:', error);
      return;
    }
    const docs: LibraryDocument[] = data
      .filter(item => !item.name.endsWith('/'))
      .map(d => ({
        name: d.name,
        path: `${folderPath}${d.name}`,
        size: d.size,
        type: d.name.split('.').pop() || 'file',
        uploadedAt: new Date(d.updated_at).toISOString().split('T')[0],
        uploadedBy: '' // could fetch metadata
      }));
    setDocuments(docs);
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      fetchDocuments(selectedFolder);
    } else {
      setDocuments([]);
    }
  }, [selectedFolder]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const folderPath = `${newFolderName.trim()}/`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(`${folderPath}.keep`, '', { upsert: false });
    if (error) {
      console.error('Error creating folder:', error);
    } else {
      setNewFolderName('');
      setIsCreateFolderOpen(false);
      fetchFolders();
    }
  };

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedFolder) return;
    for (const file of Array.from(files)) {
      const filePath = `${selectedFolder}${file.name}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });
      if (error) console.error('Upload error:', error);
    }
    setIsUploadOpen(false);
    fetchDocuments(selectedFolder);
    fetchFolders();
  };

  const deleteDocument = async (docPath: string) => {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([docPath]);
    if (error) console.error('Delete error:', error);
    fetchDocuments(selectedFolder!);
    fetchFolders();
  };

  const deleteFolder = async (folderPath: string) => {
    // Remove all items under prefix
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folderPath, { recursive: true });
    if (error) {
      console.error('List error:', error);
    } else {
      const paths = data.map(d => `${folderPath}${d.name}`);
      const { error: delErr } = await supabase.storage
        .from(bucket)
        .remove(paths);
      if (delErr) console.error('Delete folder error:', delErr);
      setSelectedFolder(null);
      fetchFolders();
    }
  };

  const filteredFolders = folders.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredDocuments = documents.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Document Library</h1>
          <p className="text-muted-foreground mt-1">Organize and manage your documents</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="h-4 w-4 mr-2"/>New Folder</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={createFolder} disabled={!newFolderName.trim()}>Create Folder</Button>
                  <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {selectedFolder && (
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button><Upload className="h-4 w-4 mr-2"/>Upload Documents</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Upload Documents</DialogTitle></DialogHeader>
                <input
                  type="file"
                  multiple
                  onChange={uploadDocument}
                  className="w-full p-2 border border-input rounded-md"
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search and Back */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedFolder && (
          <Button variant="outline" onClick={() => setSelectedFolder(null)}>Back to Folders</Button>
        )}
      </div>

      {/* Folder/List View */}
      {!selectedFolder ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFolders.map(folder => (
            <Card
              key={folder.path}
              className="p-4 hover:shadow-md cursor-pointer"
              onClick={() => setSelectedFolder(folder.path)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Folder className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold text-foreground">{folder.name}</h3>
                    <p className="text-sm text-muted-foreground">{folder.documentsCount} items</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={e => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={e => { e.stopPropagation(); deleteFolder(folder.path); }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2"/>Delete Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Created: {folder.createdAt}</div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">{selectedFolder.replace(/\/$/, '')}</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {filteredDocuments.map(doc => (
              <Card key={doc.path} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium text-foreground">{doc.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{(doc.size/1024/1024).toFixed(1)} MB</span>
                        <Badge variant="secondary">{doc.type.toUpperCase()}</Badge>
                        <span>{doc.uploadedAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(supabase.storage.from(bucket).getPublicUrl(doc.path).publicUrl, '_blank')}
                    >
                      <Download className="h-4 w-4"/>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => deleteDocument(doc.path)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2"/>Delete Document
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
}
