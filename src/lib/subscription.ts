import { createClient } from '@supabase/supabase-js';

/**
 * Check if a user has an active subscription
 * @param userId - The user's ID
 * @returns Promise<boolean> - true if subscription is active, false otherwise
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking subscription status:', error.message);
      return false;
    }

    return data?.subscription_status === 'active';
  } catch (err) {
    console.error('Failed to check subscription:', err);
    return false;
  }
}

/**
 * Check if a user has an active subscription by email
 * @param email - The user's email
 * @returns Promise<boolean> - true if subscription is active, false otherwise
 */
export async function hasActiveSubscriptionByEmail(email: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error checking subscription status:', error.message);
      return false;
    }

    return data?.subscription_status === 'active';
  } catch (err) {
    console.error('Failed to check subscription:', err);
    return false;
  }
}

/**
 * Get subscription status for a user
 * @param userId - The user's ID
 * @returns Promise<string> - The subscription status ('active', 'inactive', etc.)
 */
export async function getSubscriptionStatus(userId: string): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting subscription status:', error.message);
      return 'inactive';
    }

    return data?.subscription_status || 'inactive';
  } catch (err) {
    console.error('Failed to get subscription status:', err);
    return 'inactive';
  }
}
