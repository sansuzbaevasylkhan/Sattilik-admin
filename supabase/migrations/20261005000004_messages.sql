-- Migration for Trip Chat System
-- Created: 2026-10-05

-- 1. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_read BOOLEAN DEFAULT false
);

-- 2. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can read messages if they are either the passenger or the driver of the trip
CREATE POLICY "Users can read messages from their own trips"
ON public.messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = messages.trip_id
        AND (
            passenger_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
            OR
            driver_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
        )
    )
);

-- Users can insert messages if they are part of the trip
CREATE POLICY "Users can send messages in their own trips"
ON public.messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = messages.trip_id
        AND (
            passenger_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
            OR
            driver_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
        )
    )
);

-- 4. Indices for performance
CREATE INDEX IF NOT EXISTS idx_messages_trip_id ON public.messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
