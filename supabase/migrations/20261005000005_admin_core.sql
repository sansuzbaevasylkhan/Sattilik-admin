-- Migration for Admin Monitoring and Management
-- Created: 2026-10-05

-- 1. Driver Flags (for low rating or warnings)
CREATE TABLE IF NOT EXISTS public.driver_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ
);

-- 2. Complaints System
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    passenger_id UUID NOT NULL REFERENCES public.users(id),
    driver_id UUID NOT NULL REFERENCES public.users(id),
    text TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tariffs System
CREATE TABLE IF NOT EXISTS public.tariffs (
    id UUID PRIMARY KEY DEFAULT gen_//random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'economy', 'comfort', 'business'
    base_price NUMERIC NOT NULL,
    price_per_km NUMERIC NOT NULL,
    price_per_minute NUMERIC NOT NULL,
    night_multiplier NUMERIC DEFAULT 1.0,
    surge_multiplier NUMERIC DEFAULT 1.0,
    night_start TIME NOT NULL,
    night_end TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Promo Codes System
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT CHECK (discount_type IN ('percent', 'fixed')),
    value NUMERIC NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.driver_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Only Admins can manage these)
CREATE POLICY "Admins full access to flags" ON public.driver_flags FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins full access to complaints" ON public.complaints FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins full access to tariffs" ON public.tariffs FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins full access to promo_codes" ON public.promo_codes FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins full access to promo_redemptions" ON public.promo_redemptions FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- 7. Automatic Flagging for Low Rating (Trigger)
CREATE OR REPLACE FUNCTION public.fn_auto_flag_low_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- If rating falls below 4.0 and has at least 10 reviews
    IF NEW.average_rating < 4.0 AND (SELECT COUNT(*) FROM public.reviews WHERE driver_phone = NEW.phone) >= 10 THEN
        INSERT INTO public.driver_flags (driver_id, reason, severity)
        VALUES (NEW.id, 'Low average rating: ' || NEW.average_rating, 'medium')
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_flag_rating
AFTER UPDATE OF average_rating ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_flag_low_rating();
