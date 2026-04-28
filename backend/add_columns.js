import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function addColumns() {
  try {
    // Add status column if not exists
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'WAITING';`
    });

    if (error1) {
      console.error('Error adding status column:', error1.message);
    } else {
      console.log('✅ Status column added or already exists');
    }

    // Add served_at column if not exists
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS served_at TIMESTAMP WITH TIME ZONE;`
    });

    if (error2) {
      console.error('Error adding served_at column:', error2.message);
    } else {
      console.log('✅ Served_at column added or already exists');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

addColumns();