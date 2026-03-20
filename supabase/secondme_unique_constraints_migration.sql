-- Migration: Add missing unique constraints for SecondMe user-scoped data.
-- Run this once in the Supabase SQL editor if you encounter silent upsert failures.
--
-- Root cause: The original schema had UNIQUE (user_id, tree_id) constraints.
-- After making user_id nullable and adding secondme_user_id, upserts using
-- onConflict: 'secondme_user_id,...' silently failed because these constraints
-- didn't exist. Data was never written to the database.

-- tree_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tree_profiles_secondme_user_id_tree_id_key'
      AND conrelid = 'public.tree_profiles'::regclass
  ) THEN
    -- Remove duplicates first (keep the most recently updated row per pair)
    DELETE FROM public.tree_profiles t1
    USING public.tree_profiles t2
    WHERE t1.secondme_user_id = t2.secondme_user_id
      AND t1.tree_id = t2.tree_id
      AND t1.secondme_user_id IS NOT NULL
      AND t1.updated_at < t2.updated_at;

    ALTER TABLE public.tree_profiles
      ADD CONSTRAINT tree_profiles_secondme_user_id_tree_id_key
      UNIQUE (secondme_user_id, tree_id);
  END IF;
END $$;

-- tree_chat_highlights
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tree_chat_highlights_secondme_user_id_chat_entry_id_key'
      AND conrelid = 'public.tree_chat_highlights'::regclass
  ) THEN
    DELETE FROM public.tree_chat_highlights t1
    USING public.tree_chat_highlights t2
    WHERE t1.secondme_user_id = t2.secondme_user_id
      AND t1.chat_entry_id = t2.chat_entry_id
      AND t1.secondme_user_id IS NOT NULL
      AND t1.inserted_at < t2.inserted_at;

    ALTER TABLE public.tree_chat_highlights
      ADD CONSTRAINT tree_chat_highlights_secondme_user_id_chat_entry_id_key
      UNIQUE (secondme_user_id, chat_entry_id);
  END IF;
END $$;

-- messages (conversation messages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_secondme_user_id_chat_entry_id_key'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    DELETE FROM public.messages t1
    USING public.messages t2
    WHERE t1.secondme_user_id = t2.secondme_user_id
      AND t1.chat_entry_id = t2.chat_entry_id
      AND t1.secondme_user_id IS NOT NULL
      AND t1.created_at < t2.created_at;

    ALTER TABLE public.messages
      ADD CONSTRAINT messages_secondme_user_id_chat_entry_id_key
      UNIQUE (secondme_user_id, chat_entry_id);
  END IF;
END $$;

-- tree_engagement_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tree_engagement_events_secondme_user_id_chat_entry_id_key'
      AND conrelid = 'public.tree_engagement_events'::regclass
  ) THEN
    DELETE FROM public.tree_engagement_events t1
    USING public.tree_engagement_events t2
    WHERE t1.secondme_user_id = t2.secondme_user_id
      AND t1.chat_entry_id = t2.chat_entry_id
      AND t1.secondme_user_id IS NOT NULL
      AND t1.created_at < t2.created_at;

    ALTER TABLE public.tree_engagement_events
      ADD CONSTRAINT tree_engagement_events_secondme_user_id_chat_entry_id_key
      UNIQUE (secondme_user_id, chat_entry_id);
  END IF;
END $$;
