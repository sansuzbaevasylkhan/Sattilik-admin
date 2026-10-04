-- Migration for Trip Sharing System
-- Created: 2026-10-05

-- 1. Create trip_shares table
CREATE TABLE IF NOT EXISTS public.trip_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    revoked BOOLEAN DEFAULT false,

    CONSTRAINT trip_shares_token_length CHECK (char_length(token) >= 32)
);

-- 2. Enable RLS
ALTER TABLE public.trip_shares ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Only the authenticated user who owns the trip can manage the share token (via app)
-- Note: we assume users are linked to orders via passenger_phone or driver_phone
CREATE POLICY "Users can manage their own trip shares"
ON public.trip_shares
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = trip_shares.trip_id
        AND (
            passenger_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
            OR
            driver_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
        )
    )
);

-- Public access is NOT allowed here.
-- Access will be handled via a secure Edge Function or RPC to prevent leaking data.

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_trip_shares_token ON public.trip_shares(token);
CREATE INDEX IF NOT EXISTS idx_trip_shares_trip_id ON public.trip_shares(trip_id);
