# IBM Recap - Supabase Implementation Quick Start Guide

## 🎯 Overview

This guide provides a streamlined path to implementing Supabase authentication and storage for IBM Recap. Follow these steps in order for a successful implementation.

---

## 📚 Documentation Structure

The implementation is split across multiple documents for clarity:

1. **[SUPABASE_IMPLEMENTATION_PLAN.md](SUPABASE_IMPLEMENTATION_PLAN.md)** - Main implementation roadmap
2. **[SUPABASE_RLS_POLICIES.md](SUPABASE_RLS_POLICIES.md)** - Row Level Security setup
3. **[SUPABASE_STORAGE_SETUP.md](SUPABASE_STORAGE_SETUP.md)** - Storage bucket configuration
4. **This file** - Quick start guide and checklist

---

## ⚡ Quick Start Checklist

### Phase 1: Supabase Setup (2 hours)

#### ✅ Step 1: Create Supabase Project (30 min)
- [ ] Sign up at [supabase.com](https://supabase.com)
- [ ] Create new project: `ibm-recap`
- [ ] Save database password
- [ ] Copy Project URL and API keys
- [ ] Add credentials to `.env` file

**Environment Variables Needed:**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
JWT_SECRET=<generate-32-char-secret>
JWT_EXPIRES_IN=7d
EMAIL_FROM=noreply@ibm-recap.com
APP_URL=http://localhost:8787
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

#### ✅ Step 2: Create Database Schema (30 min)
- [ ] Open Supabase SQL Editor
- [ ] Run SQL from [SUPABASE_IMPLEMENTATION_PLAN.md](SUPABASE_IMPLEMENTATION_PLAN.md) Step 1.2
- [ ] Create `users` table
- [ ] Create `files` table
- [ ] Create `sessions` table
- [ ] Verify tables in Table Editor

---

#### ✅ Step 3: Configure RLS Policies (30 min)
- [ ] Enable RLS on all tables
- [ ] Create policies for `users` table
- [ ] Create policies for `files` table
- [ ] Create policies for `sessions` table
- [ ] Verify policies in Authentication → Policies

**See:** [SUPABASE_RLS_POLICIES.md](SUPABASE_RLS_POLICIES.md) for complete SQL

---

#### ✅ Step 4: Create Storage Buckets (30 min)
- [ ] Create `audio-files` bucket (100MB, private)
- [ ] Create `transcripts` bucket (10MB, private)
- [ ] Create `summaries` bucket (10MB, private)
- [ ] Configure storage policies for each bucket
- [ ] Verify buckets in Storage section

**See:** [SUPABASE_STORAGE_SETUP.md](SUPABASE_STORAGE_SETUP.md) for detailed setup

---

### Phase 2: Backend Implementation (10 hours)

#### ✅ Step 5: Install Dependencies (10 min)
```bash
npm install @supabase/supabase-js jsonwebtoken bcryptjs
```

---

#### ✅ Step 6: Create Auth Modules (4 hours)

Create these files in `server/auth/`:

1. **`server/auth/supabase.js`** - Supabase client initialization
2. **`server/auth/jwt.js`** - JWT token generation/verification
3. **`server/auth/password.js`** - Password hashing/validation
4. **`server/auth/email.js`** - Email validation/sending
5. **`server/auth/middleware.js`** - Authentication middleware

Create this file in `server/storage/`:

6. **`server/storage/supabase-storage.js`** - Storage helper functions

**Code templates available in:**
- [SUPABASE_IMPLEMENTATION_PLAN.md](SUPABASE_IMPLEMENTATION_PLAN.md) Step 2.2
- [SUPABASE_STORAGE_SETUP.md](SUPABASE_STORAGE_SETUP.md) Step 6

---

#### ✅ Step 7: Create Auth Routes (4 hours)

Create `server/routes/auth.js` with these endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Email verification
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

**Code template available in:** [SUPABASE_IMPLEMENTATION_PLAN.md](SUPABASE_IMPLEMENTATION_PLAN.md) Step 2.3

---

#### ✅ Step 8: Update Server (2 hours)

Update `server/index.js`:

1. Import auth modules and routes
2. Add auth routes: `app.use('/api/auth', authRoutes)`
3. Protect existing routes with `authenticate` middleware:
   - `/upload`
   - `/transcribe`
   - `/summarize`
   - `/status`
4. Update file operations to use Supabase storage
5. Update metadata to include user_id

**See:** [SUPABASE_IMPLEMENTATION_PLAN.md](SUPABASE_IMPLEMENTATION_PLAN.md) Step 2.4

---

### Phase 3: Frontend Implementation (8 hours)

#### ✅ Step 9: Create Auth Context (2 hours)

Create `public/auth-context.js`:

- AuthProvider component
- useAuth hook
- Authentication state management
- Login/logout/register functions

**Code template available in:** [SUPABASE_IMPLEMENTATION_PLAN.md](SUPABASE_IMPLEMENTATION_PLAN.md) Step 2.5

---

#### ✅ Step 10: Create Auth Modals (4 hours)

Create `public/auth-modals.js`:

1. LoginModal component
2. RegisterModal component
3. ForgotPasswordModal component
4. Modal styling

---

#### ✅ Step 11: Update App.jsx (2 hours)

1. Wrap app with AuthProvider
2. Add auth modal state management
3. Update header with login/logout buttons
4. Add authentication to API calls
5. Handle authentication errors
6. Show user info when logged in

---

### Phase 4: Testing & Deployment (2 hours)

#### ✅ Step 12: Test Authentication Flow (1 hour)

- [ ] Test user registration with IBM email
- [ ] Test email verification (check console for link)
- [ ] Test login with verified account
- [ ] Test password reset flow
- [ ] Test logout functionality
- [ ] Test protected routes (should require auth)
- [ ] Test file upload with authentication
- [ ] Test file isolation (users can't see others' files)

---

#### ✅ Step 13: Deploy to Production (1 hour)

1. Update environment variables on VPS:
   ```bash
   # Add to .env on VPS
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   JWT_SECRET=<production-secret>
   APP_URL=https://your-domain.com
   ```

2. Update Supabase settings:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/auth/callback`

3. Push to GitHub (triggers auto-deployment):
   ```bash
   git add .
   git commit -m "Add Supabase authentication and storage"
   git push origin main
   ```

4. Verify deployment:
   - [ ] Registration works
   - [ ] Email verification works
   - [ ] Login works
   - [ ] File upload works
   - [ ] Files stored in Supabase

---

## 🎯 Success Criteria

After completing all steps, you should have:

✅ **User Management:**
- Users can register with IBM email (@ibm.com)
- Email verification required before login
- Password reset functionality
- Secure session management

✅ **File Storage:**
- Audio files stored in Supabase
- Transcripts stored in Supabase
- Summaries stored in Supabase
- User-specific file isolation

✅ **Security:**
- JWT token authentication
- Row Level Security (RLS) enabled
- Protected API routes
- Secure password hashing

✅ **User Experience:**
- Login/register modals
- User info in header
- Logout functionality
- Error handling

---

## 📊 Implementation Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Supabase Setup | 2 hours | ⏳ Pending |
| 2 | Backend Auth | 10 hours | ⏳ Pending |
| 3 | Frontend Auth | 8 hours | ⏳ Pending |
| 4 | Testing & Deploy | 2 hours | ⏳ Pending |
| **Total** | | **22 hours** | |

---

## 🚨 Common Issues & Solutions

### Issue: "Email not verified"
**Solution:** Check console logs for verification link (development mode)

### Issue: "Invalid JWT token"
**Solution:** Ensure JWT_SECRET is at least 32 characters

### Issue: "Permission denied for table"
**Solution:** Verify RLS policies are created correctly

### Issue: "File upload fails"
**Solution:** Check storage policies and bucket configuration

### Issue: "User can see other users' files"
**Solution:** Verify RLS policies use `auth.uid() = user_id`

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **Supabase Storage:** https://supabase.com/docs/guides/storage
- **JWT.io:** https://jwt.io/introduction

---

## 🎉 Next Steps After MVP

Once authentication is working, you can add:

1. **Phase 3A:** Microsoft Teams Calendar Integration (16-20 hours)
2. **Phase 3B:** Past Recordings Access (12-16 hours)
3. **Phase 3C:** Direct Meeting Recording (20-24 hours)
4. **IBM w3ID Integration:** Replace email auth with IBM SSO

---

## 📝 Notes

- Start with Phase 1 (Supabase Setup) - it's the foundation
- Test each phase before moving to the next
- Keep your Supabase credentials secure (never commit to Git)
- Use the service role key only in backend code
- The anon key is safe to use in frontend code

---

## ✅ Ready to Start?

1. Read [SUPABASE_IMPLEMENTATION_PLAN.md](SUPABASE_IMPLEMENTATION_PLAN.md) for detailed instructions
2. Follow this checklist step-by-step
3. Test thoroughly after each phase
4. Deploy when all tests pass

**Good luck! 🚀**