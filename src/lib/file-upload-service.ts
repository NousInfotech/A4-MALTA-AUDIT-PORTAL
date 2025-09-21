// File Upload Service
// Uploads files directly to Supabase Storage

import { supabase } from '../integrations/supabase/client';
import { getAvailableBuckets, setupAuditPortalStorage } from './storage-setup';

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

/**
 * Uploads file directly to Supabase Storage
 * @param file - The file to upload
 * @returns Promise with upload result
 */
export const uploadFileToStorage = async (file: File): Promise<UploadResult> => {
  try {
    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file');
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'file';
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `evidence/${timestamp}-${sanitizedFileName}`;

    console.log(`Uploading file to Supabase: ${file.name} -> ${filePath}`);

    // Get available buckets and try to upload
    const availableBuckets = await getAvailableBuckets();
    console.log('Available buckets:', availableBuckets);
    
    // Try available buckets first, then fallback to common names
    const bucketNames = [
      ...availableBuckets,
      'engagement-documents', 
      'audit-portal-files', 
      'files', 
      'uploads'
    ].filter((bucket, index, arr) => arr.indexOf(bucket) === index); // Remove duplicates
    
    let uploadSuccess = false;
    let finalData: any = null;
    let finalError: any = null;
    let usedBucket = '';

    for (const bucketName of bucketNames) {
      console.log(`Trying bucket: ${bucketName}`);
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (!error) {
        uploadSuccess = true;
        finalData = data;
        usedBucket = bucketName;
        console.log(`Successfully uploaded to bucket: ${bucketName}`);
        break;
      } else {
        console.log(`Failed to upload to ${bucketName}:`, error.message);
        finalError = error;
      }
    }

    if (!uploadSuccess) {
      console.error('All bucket upload attempts failed:', finalError);
      
      // Try to set up storage buckets
      console.log('Attempting to set up storage buckets...');
      const setupSuccess = await setupAuditPortalStorage();
      
      if (!setupSuccess) {
        throw new Error(`Storage setup failed. Please contact administrator to set up file storage.`);
      }
      
      // Retry upload after setting up buckets
      const { data: retryData, error: retryError } = await supabase.storage
        .from('audit-portal-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (retryError) {
        throw new Error(`Upload failed: ${retryError.message}`);
      }
      
      finalData = retryData;
      usedBucket = 'audit-portal-files';
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(usedBucket)
      .getPublicUrl(filePath);

    const result: UploadResult = {
      url: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || `application/${fileExtension}`,
      uploadedAt: new Date().toISOString()
    };
    
    console.log(`File uploaded successfully to Supabase bucket '${usedBucket}': ${file.name} -> ${urlData.publicUrl}`);
    return result;
    
  } catch (error: any) {
    console.error('Error uploading file to Supabase:', error);
    
    // Provide specific error messages
    if (error.message?.includes('File size')) {
      throw new Error(error.message);
    } else if (error.message?.includes('Upload failed')) {
      throw new Error(error.message);
    } else if (error.message?.includes('Network Error')) {
      throw new Error('Network error: Cannot connect to Supabase. Please check your connection.');
    }
    
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Upload multiple files to Supabase Storage
 * @param files - Array of files to upload
 * @returns Promise with array of upload results
 */
export const uploadMultipleFilesToStorage = async (files: File[]): Promise<UploadResult[]> => {
  try {
    const uploadPromises = files.map(file => uploadFileToStorage(file));
    const results = await Promise.all(uploadPromises);
    
    console.log(`Successfully uploaded ${files.length} files to Supabase`);
    return results;
    
  } catch (error) {
    console.error('Error uploading multiple files to Supabase:', error);
    throw new Error('Failed to upload files to Supabase');
  }
};

/**
 * Validate file before upload
 * @param file - The file to validate
 * @returns boolean indicating if file is valid
 */
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // File size limit (10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds 10MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }
  
  // File type validation (optional - allow all types for now)
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];
  
  // For now, allow all file types
  // if (!allowedTypes.includes(file.type)) {
  //   return {
  //     isValid: false,
  //     error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
  //   };
  // }
  
  return { isValid: true };
};

/**
 * Get file preview URL (for images and PDFs)
 * @param file - The file to preview
 * @returns Promise with preview URL
 */
export const getFilePreviewUrl = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file for preview'));
    };
    
    reader.readAsDataURL(file);
  });
};
