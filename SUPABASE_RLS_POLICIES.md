# Supabase Row Level Security (RLS) Policies

This document contains all the Row Level Security policies needed for IBM Recap's Supabase database.

## Overview

Row Level Security (RLS) ensures that users can only access their own data. Each table has policies that:
- Allow users to read/write their own data
- Allow the service role (backend) full access for administrative operations
- Prevent unauthorized access to other users' data

---

## Step 1: Enable RLS on All Tables

Run this SQL in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
```

---

## Step 2: Users Table Policies

```sql
-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access on users"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Step 3: Files Table Policies

```sql
-- Users can read their own files
CREATE POLICY "Users can read own files"
  ON public.files
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own files
CREATE POLICY "Users can insert own files"
  ON public.files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own files
CREATE POLICY "Users can update own files"
  ON public.files
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
  ON public.files
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on files"
  ON public.files
  FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Step 4: Sessions Table Policies

```sql
-- Users can read their own sessions
CREATE POLICY "Users can read own sessions"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own sessions (logout)
CREATE POLICY "Users can delete own sessions"
  ON public.sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on sessions"
  ON public.sessions
  FOR ALL
  USING (auth.role() = 'service_role');
```

---

## Step 5: Verify RLS Policies

After creating all policies, verify them in Supabase dashboard:

1. Go to **Authentication** → **Policies**
2. Check each table has the correct policies
3. Test with a sample user to ensure isolation works

---

## Testing RLS Policies

### Test User Isolation

1. Create two test users in Supabase
2. Insert test data for each user
3. Try to access User A's data while authenticated as User B
4. Verify that access is denied

### Test Service Role Access

1. Use service role key in backend
2. Verify backend can access all data
3. Verify backend can perform administrative operations

---

## Common Issues & Solutions

### Issue: "new row violates row-level security policy"
**Solution**: Check that your INSERT policy includes `WITH CHECK` clause

### Issue: "permission denied for table"
**Solution**: Ensure RLS is enabled and policies are created

### Issue: Backend can't access data
**Solution**: Verify you're using service role key, not anon key

---

## Security Best Practices

1. ✅ Always enable RLS on tables with user data
2. ✅ Use service role key only in backend (never expose to frontend)
3. ✅ Test policies thoroughly before deploying
4. ✅ Use `auth.uid()` to reference current user
5. ✅ Keep policies simple and maintainable

---

## Next Steps

After setting up RLS policies, proceed to:
- [`SUPABASE_STORAGE_SETUP.md`](SUPABASE_STORAGE_SETUP.md) - Configure storage buckets
- [`SUPABASE_BACKEND_AUTH.md`](SUPABASE_BACKEND_AUTH.md) - Implement backend authentication