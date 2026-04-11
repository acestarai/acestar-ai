-- Remove legacy IBM-domain accounts and their associated AcestarAI data.
-- Review the SELECT statements first, then run the DELETE block once confirmed.

-- Preview impacted users.
SELECT id, email, full_name, created_at
FROM public.users
WHERE lower(split_part(email, '@', 2)) IN ('ibm.com', 'us.ibm.com');

-- Preview impacted meetings.
SELECT id, user_id, title, meeting_start_at, status
FROM public.meetings
WHERE user_id IN (
  SELECT id
  FROM public.users
  WHERE lower(split_part(email, '@', 2)) IN ('ibm.com', 'us.ibm.com')
);

BEGIN;

DELETE FROM public.ask_recap_messages
WHERE user_id IN (
  SELECT id
  FROM public.users
  WHERE lower(split_part(email, '@', 2)) IN ('ibm.com', 'us.ibm.com')
);

DELETE FROM public.ask_recap_chats
WHERE user_id IN (
  SELECT id
  FROM public.users
  WHERE lower(split_part(email, '@', 2)) IN ('ibm.com', 'us.ibm.com')
);

DELETE FROM public.ask_recap_chunks
WHERE user_id IN (
  SELECT id
  FROM public.users
  WHERE lower(split_part(email, '@', 2)) IN ('ibm.com', 'us.ibm.com')
);

DELETE FROM public.meeting_insights
WHERE user_id IN (
  SELECT id
  FROM public.users
  WHERE lower(split_part(email, '@', 2)) IN ('ibm.com', 'us.ibm.com')
);

DELETE FROM public.files
WHERE user_id IN (
  SELECT id
  FROM public.users
  WHERE lower(split_part(email, '@', 2)) IN ('ibm.com', 'us.ibm.com')
);

DELETE FROM public.meetings
WHERE user_id IN (
  SELECT id
  FROM public.users
  WHERE lower(split_part(email, '@', 2)) IN ('ibm.com', 'us.ibm.com')
);

DELETE FROM public.users
WHERE lower(split_part(email, '@', 2)) IN ('ibm.com', 'us.ibm.com');

COMMIT;
