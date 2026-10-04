-- Migration for Order Acceptance Timer System
-- Created: 2026-10-05

-- 1. Create order_offers table to track which drivers were offered which order
CREATE TABLE IF NOT EXISTS public.order_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    offered_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.order_offers ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Drivers can only see offers sent to them
CREATE POLICY "Drivers can view their own offers"
ON public.order_offers
FOR SELECT
USING (
    auth.uid() = driver_id
);

-- Drivers can update their own offer status (e.g., accept or decline)
CREATE POLICY "Drivers can update their own offer status"
ON public.order_offers
FOR UPDATE
USING (
    auth.uid() = driver_id
);

-- Admin can manage all offers
CREATE POLICY "Admins can manage all offers"
ON public.order_offers
FOR ALL
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- 4. Indices for performance
CREATE INDEX IF NOT EXISTS idx_order_offers_order_id ON public.order_offers(order_id);
CREATE INDEX IF NOT EXISTS idx_order_offers_driver_id ON public.order_offers(driver_id);
CREATE INDEX IF NOT EXISTS idx_order_offers_status ON public.order_offers(status);
CREATE INDEX IF NOT EXISTS idx_order_offers_expires_at ON public.order_offers(expires_at);
