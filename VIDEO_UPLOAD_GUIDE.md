# Upload Demo Video to Supabase Storage

## 📋 Step-by-Step Guide

### Step 1: Create a Public Videos Bucket in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (ibm-recap)
3. Click **Storage** in the left sidebar
4. Click **New bucket**
5. Fill in:
   - **Name**: `videos`
   - **Public bucket**: ✅ **Check this box** (important!)
   - **File size limit**: 100 MB (or higher if your video is larger)
6. Click **Create bucket**

### Step 2: Upload Your Video

1. Click on the `videos` bucket you just created
2. Click **Upload file**
3. Select your demo video file (e.g., `IBM Recap.mp4`)
4. Wait for upload to complete
5. Click on the uploaded file
6. Click **Get URL** or **Copy URL**
7. Copy the public URL - it will look like:
   ```
   https://[your-project-id].supabase.co/storage/v1/object/public/videos/IBM%20Recap.mp4
   ```

### Step 3: Update the Video URL in Your App

The URL is in `public/app.jsx` at line 257. I'll update it for you once you provide the Supabase URL.

---

## 🔄 Alternative: Use SQL to Set Bucket Policy

If you prefer to create the bucket via SQL:

```sql
-- Create videos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true);

-- Set public access policy
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'videos' );

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' 
  AND auth.role() = 'authenticated'
);
```

---

## 📝 What to Do Next

1. **Upload your video** to Supabase following steps above
2. **Copy the public URL** from Supabase
3. **Tell me the URL** and I'll update `public/app.jsx` for you

OR

4. **Update it yourself** in `public/app.jsx` line 257:
   ```jsx
   <source src="YOUR_SUPABASE_VIDEO_URL_HERE" type="video/mp4" />
   ```

---

## ✅ Benefits of Supabase Storage

- ✅ **Permanent URL** - Never expires
- ✅ **Fast CDN** - Delivered via Supabase CDN
- ✅ **Free** - Included in Supabase free tier (1GB storage)
- ✅ **Same infrastructure** - Same as your other files
- ✅ **No external dependencies** - Everything in one place

---

## 🎬 Video File Tips

**Recommended video specs:**
- Format: MP4 (H.264 codec)
- Resolution: 1920x1080 or 1280x720
- Duration: 30-60 seconds for hero section
- File size: Under 10MB for fast loading
- Compression: Use HandBrake or similar to compress if needed

**If your video is too large:**
1. Use HandBrake (free) to compress it
2. Settings: MP4, H.264, RF 23, 720p
3. This usually reduces file size by 70-80%

---

## 🚀 Ready?

Once you upload the video and get the URL, just let me know and I'll update the code!