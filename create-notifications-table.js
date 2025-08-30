const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createNotificationsTable() {
  try {
    console.log('Creating admin_notifications table...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create admin_notifications table
        CREATE TABLE IF NOT EXISTS public.admin_notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            severity VARCHAR(20) DEFAULT 'info',
            customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
            mini_pc_id UUID REFERENCES public.mini_pcs(id) ON DELETE CASCADE,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON public.admin_notifications(severity);
        CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);

        -- Enable RLS
        ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

        -- Create RLS policy
        DROP POLICY IF EXISTS "Admin full access to notifications" ON public.admin_notifications;
        CREATE POLICY "Admin full access to notifications" ON public.admin_notifications FOR ALL USING (true);

        -- Insert sample data
        INSERT INTO public.admin_notifications (type, title, message, severity) VALUES
        ('system_alert', 'System Ready', 'Admin notifications system initialized', 'info'),
        ('camera_alert', 'Monitoring Active', 'Camera health monitoring is running', 'info')
        ON CONFLICT DO NOTHING;
      `
    });

    if (error) {
      console.error('Error creating table:', error);
    } else {
      console.log('✅ admin_notifications table created successfully');
    }
  } catch (error) {
    console.error('Script error:', error);
  }
}

createNotificationsTable();
