const { createClient } = require('@supabase/supabase-js');

const userId = 'f0dac41b-8716-4917-a725-79b1df945bac';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser() {
  console.log('\n🔍 Checking user data...\n');
  
  // 1. Check user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email, customer_uid, subscription_active, subscription_status, created_at')
    .eq('id', userId)
    .single();
  
  if (userError) {
    console.error('❌ User error:', userError);
    return;
  }
  
  console.log('👤 USER:');
  console.log('  Name:', user.full_name);
  console.log('  Email:', user.email);
  console.log('  customer_uid:', user.customer_uid || '❌ NOT SET');
  console.log('  subscription_active:', user.subscription_active);
  console.log('  subscription_status:', user.subscription_status);
  console.log('  created_at:', user.created_at);
  
  // 2. Check payments
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, amount, status, payment_type, provider_transaction_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (!paymentsError && payments) {
    console.log('\n💳 PAYMENTS:');
    payments.forEach(p => {
      console.log(`  - ${p.amount} ILS | ${p.status} | ${p.payment_type} | ${p.created_at}`);
      if (p.provider_transaction_id) {
        console.log(`    Transaction: ${p.provider_transaction_id}`);
      }
    });
  }
  
  // 3. Check subscriptions
  const { data: subscriptions, error: subsError } = await supabase
    .from('subscriptions')
    .select('id, status, amount, next_billing_date, started_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (!subsError && subscriptions) {
    console.log('\n📅 SUBSCRIPTIONS:');
    subscriptions.forEach(s => {
      console.log(`  - ${s.amount} ILS/month | ${s.status} | Next: ${s.next_billing_date}`);
      console.log(`    Started: ${s.started_at}`);
    });
  }
  
  console.log('\n✅ Check complete!\n');
}

checkUser().catch(console.error);
