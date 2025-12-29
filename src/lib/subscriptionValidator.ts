/**
 * Subscription Validation Service
 * Hybrid strategy: DB cache + PayPlus API verification
 */

import { createClient } from '@supabase/supabase-js';
import { payplusClient } from './payplusClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SubscriptionValidationResult {
  hasAccess: boolean;
  reason: 'active' | 'no_subscription' | 'cancelled' | 'expired' | 'payment_failed';
  subscription?: any;
  requiresAction?: string;
}

/**
 * Validate subscription access with PayPlus sync
 * Uses 24h cache to minimize API calls
 */
export async function validateSubscriptionAccess(
  userId: string
): Promise<SubscriptionValidationResult> {
  try {
    console.log(`🔍 Validating subscription access for user: ${userId}`);

    // 1. Get subscription from DB
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error || !subscription) {
      console.log('❌ No active subscription found in DB');
      return {
        hasAccess: false,
        reason: 'no_subscription',
      };
    }

    // 2. Check if we need to verify with PayPlus (24h cache)
    const lastVerification = subscription.last_verification_at
      ? new Date(subscription.last_verification_at).getTime()
      : 0;
    const hoursSinceCheck = (Date.now() - lastVerification) / (1000 * 60 * 60);
    const needsVerification = hoursSinceCheck > 24;

    console.log(`⏰ Hours since last verification: ${hoursSinceCheck.toFixed(1)}`);

    if (!needsVerification) {
      console.log('✅ Using cached status (< 24h) - no API call');
      return {
        hasAccess: true,
        reason: 'active',
        subscription,
      };
    }

    // 3. Verify with PayPlus API (once per 24h)
    if (!subscription.recurring_uid) {
      console.warn('⚠️ Subscription missing recurring_uid - cannot verify with PayPlus');
      // Still allow access if created recently (< 7 days)
      const createdAt = new Date(subscription.created_at).getTime();
      const daysSinceCreation = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation < 7) {
        console.log('✅ New subscription (< 7 days) - allowing access');
        return {
          hasAccess: true,
          reason: 'active',
          subscription,
        };
      }

      return {
        hasAccess: false,
        reason: 'no_subscription',
        requiresAction: 'Missing recurring_uid',
      };
    }

    console.log(`🔄 Checking PayPlus API for recurring: ${subscription.recurring_uid}`);

    const payplusStatus = await payplusClient.getRecurringStatus(subscription.recurring_uid);

    if (!payplusStatus) {
      console.error('❌ Failed to get PayPlus status - allowing access (fail-open)');
      // Update last verification even on error to avoid hammering API
      await supabase
        .from('subscriptions')
        .update({
          last_verification_at: new Date().toISOString(),
          payplus_last_error: 'API call failed',
        })
        .eq('id', subscription.id);

      // Fail-open: allow access if API fails (better UX)
      return {
        hasAccess: true,
        reason: 'active',
        subscription,
      };
    }

    // 4. Sync status with PayPlus
    const isActive = payplusStatus.status === 'active';

    await supabase
      .from('subscriptions')
      .update({
        last_verification_at: new Date().toISOString(),
        payplus_status: payplusStatus.status,
        payplus_last_error: null,
        ...(payplusStatus.status !== 'active' && {
          status: 'cancelled',
          cancelled_at: payplusStatus.cancelled_at || new Date().toISOString(),
        }),
      })
      .eq('id', subscription.id);

    if (!isActive) {
      console.log(`❌ PayPlus status is ${payplusStatus.status} - denying access`);
      return {
        hasAccess: false,
        reason: payplusStatus.status === 'cancelled' ? 'cancelled' : 'expired',
        subscription,
      };
    }

    console.log('✅ PayPlus verification successful - access granted');

    return {
      hasAccess: true,
      reason: 'active',
      subscription: {
        ...subscription,
        payplus_status: payplusStatus.status,
      },
    };
  } catch (error) {
    console.error('❌ Error validating subscription:', error);
    // Fail-open on unexpected errors
    return {
      hasAccess: true,
      reason: 'active',
    };
  }
}

/**
 * Quick check without PayPlus verification (for UI)
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return !!subscription;
}
