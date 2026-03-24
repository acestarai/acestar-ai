import { supabase } from '../auth/supabase.js';
import fs from 'fs';
import path from 'path';

/**
 * Upload file to Supabase storage
 * @param {string} userId - User ID
 * @param {string} bucket - Bucket name (audio-files, transcripts, summaries)
 * @param {string} filePath - Local file path
 * @param {string} originalFilename - Original filename
 * @returns {Promise<object>} Upload result with path and URL
 */
export async function uploadFile(userId, bucket, filePath, originalFilename) {
  try {
    const timestamp = Date.now();
    const ext = path.extname(originalFilename);
    const basename = path.basename(originalFilename, ext);
    const storagePath = `${userId}/${timestamp}_${basename}${ext}`;
    
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: getMimeType(ext),
        upsert: false
      });
    
    if (error) {
      throw error;
    }
    
    return {
      path: storagePath,
      bucket: bucket,
      size: fileBuffer.length
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * Download file from Supabase storage
 * @param {string} bucket - Bucket name
 * @param {string} storagePath - Storage path
 * @param {string} localPath - Local destination path
 * @returns {Promise<string>} Local file path
 */
export async function downloadFile(bucket, storagePath, localPath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(storagePath);
    
    if (error) {
      throw error;
    }
    
    // Convert blob to buffer and save
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(localPath, buffer);
    
    return localPath;
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Delete file from Supabase storage
 * @param {string} bucket - Bucket name
 * @param {string} storagePath - Storage path
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFile(bucket, storagePath) {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([storagePath]);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

/**
 * Get signed URL for private file access
 * @param {string} bucket - Bucket name
 * @param {string} storagePath - Storage path
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedUrl(bucket, storagePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn);
    
    if (error) {
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Signed URL error:', error);
    throw error;
  }
}

/**
 * List user's files in bucket
 * @param {string} userId - User ID
 * @param {string} bucket - Bucket name
 * @returns {Promise<Array>} List of files
 */
export async function listUserFiles(userId, bucket) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(userId);
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('List files error:', error);
    throw error;
  }
}

/**
 * Get file metadata
 * @param {string} bucket - Bucket name
 * @param {string} storagePath - Storage path
 * @returns {Promise<object>} File metadata
 */
export async function getFileMetadata(bucket, storagePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path.dirname(storagePath), {
        search: path.basename(storagePath)
      });
    
    if (error) {
      throw error;
    }
    
    return data[0] || null;
  } catch (error) {
    console.error('Get metadata error:', error);
    throw error;
  }
}

/**
 * Delete all files for a user (cleanup on account deletion)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteAllUserFiles(userId) {
  try {
    const buckets = ['audio-files', 'transcripts', 'summaries'];
    
    for (const bucket of buckets) {
      const files = await listUserFiles(userId, bucket);
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${userId}/${f.name}`);
        await supabase.storage
          .from(bucket)
          .remove(filePaths);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Delete all files error:', error);
    throw error;
  }
}

/**
 * Get MIME type from file extension
 * @param {string} ext - File extension
 * @returns {string} MIME type
 */
function getMimeType(ext) {
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.txt': 'text/plain',
    '.md': 'text/plain',
    '.json': 'application/json',
    '.pdf': 'application/pdf'
  };
  return mimeTypes[ext.toLowerCase()] || 'text/plain';
}

console.log('✅ Storage utilities initialized');

// Made with Bob
