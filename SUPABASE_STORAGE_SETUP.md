# Supabase Storage Bucket Configuration

This document provides step-by-step instructions for setting up Supabase storage buckets for IBM Recap.

## Overview

We'll create three storage buckets:
1. **audio-files** - For uploaded audio recordings (MP3, M4A, WAV)
2. **transcripts** - For generated transcripts (TXT, JSON)
3. **summaries** - For generated summaries (PDF, TXT)

All buckets are **private** with user-specific access control.

---

## Step 1: Create Audio Files Bucket

1. In Supabase dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Fill in details:
   - **Name**: `audio-files`
   - **Public bucket**: ❌ Unchecked (private)
   - **File size limit**: 100 MB
   - **Allowed MIME types**: `audio/mpeg, audio/mp4, audio/x-m4a, audio/wav`
4. Click "Create bucket"

---

## Step 2: Create Transcripts Bucket

1. Click "Create a new bucket"
2. Fill in details:
   - **Name**: `transcripts`
   - **Public bucket**: ❌ Unchecked (private)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `text/plain, application/json`
3. Click "Create bucket"

---

## Step 3: Create Summaries Bucket

1. Click "Create a new bucket"
2. Fill in details:
   - **Name**: `summaries`
   - **Public bucket**: ❌ Unchecked (private)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `application/pdf, text/plain`
3. Click "Create bucket"

---

## Step 4: Configure Storage Policies

### Audio Files Bucket Policies

Run this SQL in Supabase SQL Editor:

```sql
-- Audio files bucket policies
CREATE POLICY "Users can upload own audio files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'audio-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own audio files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'audio-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own audio files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'audio-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own audio files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'audio-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Transcripts Bucket Policies

```sql
-- Transcripts bucket policies
CREATE POLICY "Users can upload own transcripts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'transcripts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own transcripts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'transcripts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own transcripts"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'transcripts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own transcripts"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'transcripts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Summaries Bucket Policies

```sql
-- Summaries bucket policies
CREATE POLICY "Users can upload own summaries"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'summaries' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own summaries"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'summaries' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own summaries"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'summaries' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own summaries"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'summaries' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Step 5: File Organization Structure

Files will be organized by user ID:

```
audio-files/
  ├─ {user_id}/
  │   ├─ {timestamp}_{filename}.m4a
  │   ├─ {timestamp}_{filename}.mp3
  │   └─ {timestamp}_{filename}.wav

transcripts/
  ├─ {user_id}/
  │   ├─ {timestamp}_{filename}.txt
  │   └─ {timestamp}_{filename}.json

summaries/
  ├─ {user_id}/
  │   ├─ {timestamp}_{filename}.pdf
  │   └─ {timestamp}_{filename}.txt
```

Example:
```
audio-files/
  ├─ 550e8400-e29b-41d4-a716-446655440000/
  │   └─ 1710936000000_meeting_recording.m4a

transcripts/
  ├─ 550e8400-e29b-41d4-a716-446655440000/
  │   └─ 1710936000000_meeting_recording.txt

summaries/
  ├─ 550e8400-e29b-41d4-a716-446655440000/
  │   └─ 1710936000000_meeting_recording.pdf
```

---

## Step 6: Backend Storage Helper Functions

Create `server/storage/supabase-storage.js`:

```javascript
import { supabase } from '../auth/supabase.js';
import fs from 'fs';
import path from 'path';

/**
 * Upload file to Supabase storage
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
      url: getPublicUrl(bucket, storagePath)
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * Download file from Supabase storage
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
 * Get MIME type from file extension
 */
function getMimeType(ext) {
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.pdf': 'application/pdf'
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Get public URL (for reference, files are private)
 */
function getPublicUrl(bucket, storagePath) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);
  
  return data.publicUrl;
}
```

---

## Step 7: Verify Storage Setup

1. Go to **Storage** in Supabase dashboard
2. Verify all three buckets exist
3. Check bucket settings (private, size limits, MIME types)
4. Go to **Storage** → **Policies**
5. Verify policies are created for each bucket

---

## Testing Storage

### Test File Upload

```javascript
// Test uploading a file
const result = await uploadFile(
  'user-id-here',
  'audio-files',
  '/path/to/local/file.m4a',
  'meeting_recording.m4a'
);
console.log('Uploaded:', result);
```

### Test File Download

```javascript
// Test downloading a file
await downloadFile(
  'audio-files',
  'user-id/timestamp_file.m4a',
  '/path/to/download/file.m4a'
);
```

### Test Signed URL

```javascript
// Test getting signed URL
const url = await getSignedUrl(
  'audio-files',
  'user-id/timestamp_file.m4a',
  3600 // 1 hour
);
console.log('Signed URL:', url);
```

---

## Common Issues & Solutions

### Issue: "new row violates row-level security policy"
**Solution**: Ensure file path starts with user ID: `{userId}/filename`

### Issue: "File size exceeds limit"
**Solution**: Check bucket size limits and adjust if needed

### Issue: "Invalid MIME type"
**Solution**: Verify file extension matches allowed MIME types

### Issue: "Permission denied"
**Solution**: Check storage policies are created correctly

---

## Security Best Practices

1. ✅ Always use user ID as first folder level
2. ✅ Generate unique filenames with timestamps
3. ✅ Use signed URLs for temporary access
4. ✅ Set appropriate expiration times for signed URLs
5. ✅ Clean up temporary files after upload
6. ✅ Validate file types before upload

---

## Next Steps

After setting up storage buckets, proceed to:
- [`SUPABASE_BACKEND_AUTH.md`](SUPABASE_BACKEND_AUTH.md) - Implement backend authentication
- [`SUPABASE_BACKEND_INTEGRATION.md`](SUPABASE_BACKEND_INTEGRATION.md) - Integrate storage with server