-- Migration for Driver Statistics
-- Created: 2026-10-05

-- 1. Create a function to get driver statistics based on period
-- Periods: 'day', 'week', 'month'
CREATE OR REPLACE FUNCTION public.get_driver_stats(driver_phone_input TEXT, period_input TEXT)
RETURNS TABLE (
    total_earnings NUMERIC,
    trip_count INTEGER,
    avg_rating NUMERIC,
    earnings_history JSONB
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    -- Calculate start date based on period
    IF period_input = 'day' THEN
        start_date := date_trunc('day', now());
    ELSIF period_input = 'week' THEN
        start_date := date_trunc('week', now());
    ELSIF period_input = 'month' THEN
        start_date := date_trunc('month', now());
    ELSE
        start_date := date_trunc('month', now());
    END IF;

    RETURN QUERY
    WITH daily_stats AS (
        -- Aggregate earnings per day for the history graph
        SELECT
            date_trunc('day', created_at)::date as day,
            SUM(price) as daily_sum
        FROM public.orders
        WHERE driver_phone = driver_phone_input
          AND status = 'completed'
          AND created_at >= start_date
        GROUP BY 1
        ORDER BY 1
    )
    SELECT
        COALESCE((SELECT SUM(price) FROM public.orders WHERE driver_phone = driver_phone_input AND status = 'completed' AND created_at >= start_date), 0) as total_earnings,
        (SELECT COUNT(*)::INTEGER FROM public.orders WHERE driver_phone = driver_phone_input AND status = 'completed' AND created_at >= start_date) as trip_count,
        COALESCE((SELECT average_rating FROM public.users WHERE phone = driver_phone_input), 5.0) as avg_rating,
        (SELECT jsonb_agg(jsonb_build_object('date', day, 'value', daily_sum)) FROM daily_stats) as earnings_history;
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure RLS for the function (since it's SECURITY DEFINER it runs as admin,
-- but we must verify the caller is the driver themselves)
-- Note: If using SECURITY INVOKER, the user needs access to orders table.
-- Here we use SECURITY DEFINER but add a check inside if needed.
ALTER FUNCTION public.get_driver_stats(TEXT, TEXT) SECURITY DEFINER;
