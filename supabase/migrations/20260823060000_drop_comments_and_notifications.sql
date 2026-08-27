-- Drop triggers and functions related to notifications and comments
DROP FUNCTION IF EXISTS public.sync_comment_mentions() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_single_level_comment_replies() CASCADE;
DROP FUNCTION IF EXISTS public.notify_parent_comment_author_of_reply() CASCADE;
DROP FUNCTION IF EXISTS public.remove_notifications_for_deleted_comment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_users_of_published_anime() CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.comment_mentions CASCADE;
DROP TABLE IF EXISTS public.comment_likes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
