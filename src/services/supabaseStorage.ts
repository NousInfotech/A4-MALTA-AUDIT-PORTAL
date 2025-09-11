import { supabase } from '@/integrations/supabase/client';

export interface StorageFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  storageKey?: string; // The actual key used in Supabase storage
}

export interface UploadResult {
  success: boolean;
  file?: StorageFile;
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

class SupabaseStorageService {
  private bucketName = 'engagement-documents';

  /**
   * Check if user is authenticated and return session info
   */
  private async checkAuthentication(): Promise<{ success: boolean; session?: any; error?: string }> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        return { success: false, error: sessionError.message };
      }
      
      if (!session) {
        console.error('❌ No active session');
        return { success: false, error: 'User must be authenticated' };
      }
      
      console.log('✅ User authenticated:', { userId: session.user.id, email: session.user.email });
      return { success: true, session };
      
    } catch (error) {
      console.error('❌ Authentication check failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication check failed' 
      };
    }
  }

  /**
   * Sanitize filename for Supabase storage
   * Supabase storage keys must be URL-safe and cannot contain special characters
   */
  private sanitizeFileName(fileName: string): string {
    const sanitized = fileName
      .replace(/[^a-zA-Z0-9\-_\.]/g, '-') // Replace special chars with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .toLowerCase() // Convert to lowercase
      .substring(0, 100); // Limit length to 100 characters
    
    console.log('🔧 Filename sanitization:', { original: fileName, sanitized });
    return sanitized;
  }

  /**
   * Upload a file to Supabase storage
   */
  async uploadFile(
    file: File | Blob,
    fileName: string,
    folder: string = 'documents'
  ): Promise<UploadResult> {
    try {
      console.log('📤 Uploading file to Supabase:', { fileName, folder });

      // Check if user is authenticated
      const authResult = await this.checkAuthentication();
      if (!authResult.success) {
        return { 
          success: false, 
          error: authResult.error || 'User must be authenticated to upload files' 
        };
      }

      // Sanitize filename for Supabase storage
      const sanitizedFileName = this.sanitizeFileName(fileName);
      
      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      // Use ISQM-specific folder structure: isqm/{parentId}/{type}/{filename}
      const uniqueFileName = `isqm/${folder}/${timestamp}-${sanitizedFileName}`;

      console.log('📤 Sanitized filename:', { original: fileName, sanitized: sanitizedFileName, storageKey: uniqueFileName });

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(uniqueFileName);

      const fileInfo: StorageFile = {
        id: data.path,
        name: fileName, // Use original filename for display
        url: urlData.publicUrl,
        size: file.size,
        type: file.type || 'application/pdf',
        uploadedAt: new Date().toISOString(),
        storageKey: uniqueFileName // Store the actual storage key
      };

      console.log('✅ File uploaded successfully:', fileInfo);
      return { success: true, file: fileInfo };

    } catch (error) {
      console.error('❌ Upload failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  /**
   * Download a file from Supabase storage
   */
  async downloadFile(filePath: string): Promise<DownloadResult> {
    try {
      console.log('📥 Downloading file from Supabase:', filePath);

      // Check if user is authenticated
      const authResult = await this.checkAuthentication();
      if (!authResult.success) {
        return { 
          success: false, 
          error: authResult.error || 'User must be authenticated to download files' 
        };
      }

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error) {
        console.error('❌ Supabase download error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ File downloaded successfully');
      return { success: true, blob: data };

    } catch (error) {
      console.error('❌ Download failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Download failed' 
      };
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Delete a file from Supabase storage
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting file from Supabase:', filePath);

      // Check if user is authenticated
      const authResult = await this.checkAuthentication();
      if (!authResult.success) {
        return { 
          success: false, 
          error: authResult.error || 'User must be authenticated to delete files' 
        };
      }

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Supabase delete error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ File deleted successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Delete failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      };
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string = 'documents'): Promise<StorageFile[]> {
    try {
      console.log('📋 Listing files in folder:', folder);

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(folder);

      if (error) {
        console.error('❌ Supabase list error:', error);
        return [];
      }

      const files: StorageFile[] = data.map(file => ({
        id: `${folder}/${file.name}`,
        name: file.name,
        url: this.getPublicUrl(`${folder}/${file.name}`),
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'application/pdf',
        uploadedAt: file.created_at || new Date().toISOString()
      }));

      console.log('✅ Files listed successfully:', files.length);
      return files;

    } catch (error) {
      console.error('❌ List files failed:', error);
      return [];
    }
  }

  /**
   * Convert PDF blob to downloadable file
   */
  async downloadBlobAsFile(blob: Blob, fileName: string): Promise<void> {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      console.log('✅ File downloaded:', fileName);
    } catch (error) {
      console.error('❌ Download blob failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();
