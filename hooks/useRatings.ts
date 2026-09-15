import { useCallback } from 'react';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export type SubmitReviewInput = {
  orderId: string;
  driverPhone: string;
  passengerFirstName: string;
  passengerLastName: string;
  stars: number;
  comment: string;
};

export function useRatings() {
  const submitReview = useCallback(async (input: SubmitReviewInput) => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        order_id: input.orderId,
        driver_phone: input.driverPhone,
        passenger_first_name: input.passengerFirstName,
        passenger_last_name: input.passengerLastName,
        stars: input.stars,
        comment: input.comment,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Failed to submit review');
    }

    return res.json();
  }, []);

  return {
    submitReview,
  };
}

