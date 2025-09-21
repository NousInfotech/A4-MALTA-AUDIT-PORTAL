// Storage Setup Utility
// Helps set up Supabase storage buckets and policies

import { supabase } from '../integrations/supabase/client';

export interface StorageBucket {
  name: string;
  public: boolean;
  allowedMimeTypes: string[] | null;
  fileSizeLimit: number;
}

/**
 * Check if a storage bucket exists
 * @param bucketName - Name of the bucket to check
 * @returns Promise<boolean>
 */
export const checkBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage.getBucket(bucketName);
    return !error && data !== null;
  } catch (error) {
    console.error(`Error checking bucket ${bucketName}:`, error);
    return false;
  }
};

/**
 * Create a storage bucket with proper settings
 * @param bucketName - Name of the bucket to create
 * @param options - Bucket configuration options
 * @returns Promise<boolean>
 */
export const createStorageBucket = async (
  bucketName: string, 
  options: Partial<StorageBucket> = {}
): Promise<boolean> => {
  try {
    const bucketConfig = {
      public: true,
      allowedMimeTypes: null, // Allow all file types
      fileSizeLimit: 10485760, // 10MB
      ...options
    };

    const { error } = await supabase.storage.createBucket(bucketName, bucketConfig);
    
    if (error) {
      console.error(`Error creating bucket ${bucketName}:`, error);
      return false;
    }

    console.log(`Successfully created bucket: ${bucketName}`);
    return true;
  } catch (error) {
    console.error(`Error creating bucket ${bucketName}:`, error);
    return false;
  }
};

/**
 * Set up storage buckets for the audit portal
 * @returns Promise<boolean>
 */
export const setupAuditPortalStorage = async (): Promise<boolean> => {
  try {
    const buckets = [
      {
        name: 'engagement-documents',
        public: true,
        allowedMimeTypes: null,
        fileSizeLimit: 10485760
      },
      {
        name: 'audit-portal-files',
        public: true,
        allowedMimeTypes: null,
        fileSizeLimit: 10485760
      }
    ];

    let allSuccess = true;

    for (const bucket of buckets) {
      const exists = await checkBucketExists(bucket.name);
      if (!exists) {
        console.log(`Creating bucket: ${bucket.name}`);
        const created = await createStorageBucket(bucket.name, bucket);
        if (!created) {
          allSuccess = false;
        }
      } else {
        console.log(`Bucket already exists: ${bucket.name}`);
      }
    }

    return allSuccess;
  } catch (error) {
    console.error('Error setting up storage:', error);
    return false;
  }
};

/**
 * Get list of available storage buckets
 * @returns Promise<string[]>
 */
export const getAvailableBuckets = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return [];
    }

    return data?.map(bucket => bucket.name) || [];
  } catch (error) {
    console.error('Error listing buckets:', error);
    return [];
  }
};
