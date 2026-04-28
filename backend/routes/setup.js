// backend/routes/setup.js
import express from 'express';
import supabase from '../lib/supabaseClient.js';

const router = express.Router();

/**
 * POST /api/setup/init-schema
 * Adds missing columns to prescriptions table if they don't exist
 */
router.post('/init-schema', async (req, res) => {
  try {
    console.log('[Setup] Checking and initializing database schema...');

    // First, try to query with the new columns
    const { data, error: queryError } = await supabase
      .from('prescriptions')
      .select('status, served_at')
      .limit(1);

    if (!queryError) {
      console.log('[Setup] ✅ Columns already exist');
      return res.json({ success: true, message: 'Schema already initialized' });
    }

    // If columns don't exist, we need to add them via SQL
    // For now, return instructions
    console.log('[Setup] ⚠️  Missing columns detected');
    console.log('[Setup] Run this SQL in Supabase Dashboard → SQL Editor:');
    console.log(`
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'WAITING';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS served_at TIMESTAMP WITH TIME ZONE;
UPDATE prescriptions SET status = 'WAITING' WHERE status IS NULL;
    `);

    return res.json({
      success: false,
      message: 'Schema migration needed',
      instructions: 'Run the SQL commands shown in server logs'
    });

  } catch (err) {
    console.error('[Setup] Error:', err.message);
    res.json({ success: false, error: err.message });
  }
});

/**
 * GET /api/setup/dashboard-data
 * Gets simplified dashboard data - counts and list
 */
router.get('/dashboard-data', async (req, res) => {
  try {
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fetch all prescriptions from today
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .gte('created_at', today)
      .lt('created_at', tomorrowStr)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Dashboard] Fetch error:', error.message);
      return res.json({
        success: false,
        data: {
          total: 0,
          served: 0,
          waiting: 0,
          revenue: 0,
          prescriptions: []
        },
        error: error.message
      });
    }

    const prescriptions = data || [];

    // Calculate metrics
    const total = prescriptions.length;
    const served = prescriptions.filter(p => p.status === 'SERVED').length;
    const waiting = prescriptions.filter(p => p.status === 'WAITING' || p.status === 'SERVING').length;
    
    const revenue = prescriptions
      .filter(p => p.status === 'SERVED')
      .reduce((sum, p) => {
        let amount = 0;
        if (typeof p.bill === 'object' && p.bill !== null) {
          amount = parseFloat(p.bill?.pricing?.grandTotal || p.bill?.totalAmount || 0) || 0;
        } else if (typeof p.bill === 'string') {
          try {
            const billObj = JSON.parse(p.bill);
            amount = parseFloat(billObj?.pricing?.grandTotal || billObj?.totalAmount || 0) || 0;
          } catch (e) {
            amount = 0;
          }
        }
        return sum + amount;
      }, 0);

    console.log(`[Dashboard] Today: ${total} prescriptions, ${served} served, ${waiting} waiting, ₹${Math.round(revenue)} revenue`);

    res.json({
      success: true,
      data: {
        total,
        served,
        waiting,
        revenue: Math.round(revenue),
        prescriptions
      }
    });

  } catch (err) {
    console.error('[Dashboard] Error:', err.message);
    res.json({
      success: false,
      error: err.message,
      data: {
        total: 0,
        served: 0,
        waiting: 0,
        revenue: 0,
        prescriptions: []
      }
    });
  }
});

export default router;
