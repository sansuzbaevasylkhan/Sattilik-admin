import { useCallback } from 'react';
import { Share } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { getUser } from '@/store/userStore';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function useTripShare() {
  const shareTrip = useCallback(async (tripId: string) => {
    try {
      // Generate a random secure token
      const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 12); // Valid for 12 hours

      const { error } = await supabase
        .from('trip_shares')
        .insert({
          trip_id: tripId,
          token: token,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      // Construct the sharing URL (Next.js app)
      const shareUrl = `${process.env.EXPO_PUBLIC_WEB_URL || 'https://sattilik.kz'}/track/${token}`;

      await Share.share({
        message: `Менің сапарымды бақылаңыз: ${shareUrl}`,
      });

      return { success: true, url: shareUrl };
    } catch (e: any) {
      console.error('Share error:', e);
      throw e;
    }
  }, []);

  return { shareTrip };
}
