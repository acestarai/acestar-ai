# IBM Recap - Supabase Authentication & Storage Implementation Plan

## 📋 Overview

This document provides a complete implementation plan for adding Supabase authentication and cloud storage to IBM Recap. The implementation follows a two-phase approach:

- **Phase 1**: Supabase Setup (2 hours)
- **Phase 2**: Email/Password Authentication (20 hours)

**Total Estimated Time**: 22 hours (1.5 weeks)

---

## 🎯 Implementation Goals

### What We're Building:
1. ✅ User registration with IBM email validation (@ibm.com only)
2. ✅ Email verification system
3. ✅ Secure login/logout functionality
4. ✅ Password reset capability
5. ✅ Cloud file storage (audio, transcripts, summaries)
6. ✅ User-specific file isolation
7. ✅ Session management with JWT tokens
8. ✅ Protected API routes

### What We're NOT Building (Yet):
- ❌ Microsoft Teams integration (Phase 3 - future)
- ❌ IBM w3ID authentication (post-MVP)
- ❌ File migration from local storage
- ❌ Social login (Google, GitHub, etc.)

---

## 📦 Phase 1: Supabase Setup (2 hours)

### Step 1.1: Create Supabase Account & Project (30 minutes)

#### 1. Sign Up for Supabase
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Verify your email address

#### 2. Create New Project
1. Click "New Project"
2. Fill in project details:
   - **Organization**: Create new or select existing
   - **Project Name**: `ibm-recap` or `ibm-recap-prod`
   - **Database Password**: Generate strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `us-east-1` for US East Coast)
   - **Pricing Plan**: Free tier (sufficient for MVP)
3. Click "Create new project"
4. Wait 2-3 minutes for project provisioning

#### 3. Get API Credentials
1. In Supabase dashboard, go to **Settings** → **API**
2. Copy and save these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (public, safe for frontend)
   - **service_role key**: `eyJhbGc...` (secret, backend only!)

---

### Step 1.2: Create Database Schema (30 minutes)

#### 1. Create Users Table
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Paste and run this SQL:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verification_token_expires TIMESTAMPTZ,
  reset_token TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@ibm\.com$'),
  CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON public.users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON public.users(reset_token);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 2. Create Files Table
```sql
-- Create files table
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('audio', 'transcript', 'summary')),
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  duration TEXT,
  category TEXT,
  
  -- Transcription metadata
  has_transcript BOOLEAN DEFAULT FALSE,
  has_summary BOOLEAN DEFAULT FALSE,
  speaker_diarization BOOLEAN DEFAULT FALSE,
  action_items_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_file_type CHECK (file_type IN ('audio', 'transcript', 'summary'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON public.files(file_type);

-- Create updated_at trigger
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 3. Create Sessions Table
```sql
-- Create sessions table for JWT token management
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);
```

---

### Step 1.3: Configure Row Level Security (RLS) (30 minutes)

See [`SUPABASE_RLS_POLICIES.md`](SUPABASE_RLS_POLICIES.md) for complete RLS policy setup.

---

### Step 1.4: Create Storage Buckets (30 minutes)

See [`SUPABASE_STORAGE_SETUP.md`](SUPABASE_STORAGE_SETUP.md) for complete storage bucket configuration.

---

### Step 1.5: Update Environment Variables (10 minutes)

#### 1. Add Supabase Credentials to `.env`
```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Email Configuration (Supabase handles this)
EMAIL_FROM=noreply@ibm-recap.com
APP_URL=http://localhost:8787
```

#### 2. Update `.env.example`
```bash
# Add to .env.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
JWT_SECRET=your_jwt_secret_here_min_32_characters
JWT_EXPIRES_IN=7d
EMAIL_FROM=noreply@ibm-recap.com
APP_URL=http://localhost:8787
```

#### 3. Generate JWT Secret
Run this in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and use it as `JWT_SECRET`

---

### ✅ Phase 1 Completion Checklist

Before moving to Phase 2, verify:

- [ ] Supabase project created and accessible
- [ ] Database tables created: `users`, `files`, `sessions`
- [ ] RLS enabled on all tables
- [ ] RLS policies created and tested
- [ ] Storage buckets created: `audio-files`, `transcripts`, `summaries`
- [ ] Storage policies configured
- [ ] Email templates customized
- [ ] Environment variables added to `.env`
- [ ] `.env.example` updated with new variables

**Estimated Time**: 2 hours

---

## 🔐 Phase 2: Email/Password Authentication (20 hours)

### Step 2.1: Install Dependencies (10 minutes)

```bash
npm install @supabase/supabase-js jsonwebtoken bcryptjs
```

Verify these dependencies are added to [`package.json`](package.json):
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  }
}
```

---

### Step 2.2: Backend Implementation (10 hours)

See these detailed implementation guides:
- [`SUPABASE_BACKEND_AUTH.md`](SUPABASE_BACKEND_AUTH.md) - Authentication modules and routes
- [`SUPABASE_BACKEND_INTEGRATION.md`](SUPABASE_BACKEND_INTEGRATION.md) - Server integration

---

### Step 2.3: Frontend Implementation (8 hours)

See these detailed implementation guides:
- [`SUPABASE_FRONTEND_AUTH.md`](SUPABASE_FRONTEND_AUTH.md) - Auth context and modals
- [`SUPABASE_FRONTEND_INTEGRATION.md`](SUPABASE_FRONTEND_INTEGRATION.md) - App.jsx integration

---

### Step 2.4: Testing & Deployment (2 hours)

See [`SUPABASE_TESTING_GUIDE.md`](SUPABASE_TESTING_GUIDE.md) for complete testing procedures.

---

## 📊 Implementation Timeline

```
Week 1:
├─ Day 1-2: Phase 1 - Supabase Setup (2 hours)
├─ Day 3-4: Phase 2 - Backend Auth (10 hours)
└─ Day 5-6: Phase 2 - Frontend Auth (8 hours)

Week 2:
├─ Day 7: Phase 2 - Testing & Polish (2 hours)
└─ Day 8: Deploy to production
```

**Total Time**: 22 hours (1.5 weeks)

---

## 🚀 Next Steps After MVP

Once Phase 1-2 are complete, you can optionally add:

1. **Phase 3A**: Teams Calendar Integration (16-20 hours)
2. **Phase 3B**: Past Recordings Access (12-16 hours)
3. **Phase 3C**: Direct Meeting Recording (20-24 hours)

See the original implementation order document for details on Phase 3.

---

## 📞 Support & Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Supabase Auth Guide**: https://supabase.com/docs/guides/auth
- **Supabase Storage Guide**: https://supabase.com/docs/guides/storage
- **JWT Best Practices**: https://jwt.io/introduction

---

## 🎉 Summary

This implementation plan provides a complete roadmap for adding Supabase authentication and storage to IBM Recap. Follow the steps sequentially, and use the detailed implementation guides for each phase.

**Key Files to Create:**
1. `SUPABASE_RLS_POLICIES.md` - RLS policy setup
2. `SUPABASE_STORAGE_SETUP.md` - Storage bucket configuration
3. `SUPABASE_BACKEND_AUTH.md` - Backend authentication code
4. `SUPABASE_BACKEND_INTEGRATION.md` - Server integration
5. `SUPABASE_FRONTEND_AUTH.md` - Frontend auth components
6. `SUPABASE_FRONTEND_INTEGRATION.md` - App.jsx updates
7. `SUPABASE_TESTING_GUIDE.md` - Testing procedures

Start with Phase 1 (Supabase Setup), then proceed to Phase 2 (Authentication) once Phase 1 is complete and verified.