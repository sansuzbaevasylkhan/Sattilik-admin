-- Migration for Push Notifications System
-- Created: 2026-10-05

-- 1. Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT, -- 'ios' or 'android'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT unique_user_token UNIQUE (user_id, token)
);

-- 2. Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can manage their own tokens
CREATE POLICY "Users can manage their own push tokens"
ON public.push_tokens
FOR ALL
USING (auth.uid() = user_id);

-- Admin can manage all tokens
CREATE POLICY "Admins can manage all push tokens"
ON public.push_tokens
FOR ALL
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
