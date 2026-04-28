import express from 'express';
import { getQueueStatus, serveNext, markServed } from '../agents/queueAgent.js';
import supabase from '../lib/supabaseClient.js';

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('prescriptions')
      .select('token_number, patient_name, status, created_at')
      .in('status', ['WAITING', 'SERVING'])
      .gte('created_at', today)
      .lt('created_at', tomorrowStr)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Queue] Error fetching queue status:', error.message);
      res.json({ success: false, data: { queue: [], currentlyServing: 0, totalWaiting: 0 } });
    } else {
      const queue = data.filter(row => row.status === 'WAITING').map(row => ({
        tokenNumber: row.token_number,
        patientName: row.patient_name,
        status: row.status,
        addedAt: row.created_at
      }));
      const currentlyServing = data.find(row => row.status === 'SERVING')?.token_number || 0;
      const totalWaiting = queue.length;

      res.json({ success: true, data: { queue, currentlyServing, totalWaiting } });
    }
  } catch (err) {
    console.error('[Queue] Unexpected error:', err.message);
    res.json({ success: false, data: { queue: [], currentlyServing: 0, totalWaiting: 0 } });
  }
});

router.post('/serve-next', async (req, res) => {
  const next = serveNext();
  
  // Update Supabase to mark prescription as SERVING
  if (next && next.tokenNumber) {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'SERVING' })
        .eq('token_number', next.tokenNumber);
      
      if (error) {
        console.error('[Queue] Error updating serve status:', error.message);
      } else {
        console.log(`[Queue] ✅ Marked token #${next.tokenNumber} as SERVING`);
      }
    } catch (err) {
      console.error('[Queue] Unexpected error:', err.message);
    }
  }
  
  res.json({ success: true, data: next || { message: 'Queue empty' } });
});

// In-memory storage for served patients (in production: Redis or database)
const servedPatients = new Set();

router.post('/mark-served', async (req, res) => {
  const served = markServed();
  
  // Update Supabase to mark as SERVED
  if (served && served.tokenNumber) {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ 
          status: 'SERVED',
          served_at: new Date().toISOString()
        })
        .eq('token_number', served.tokenNumber);
      
      if (error) {
        console.error('[Queue] Error updating served status:', error.message);
      } else {
        console.log(`[Queue] ✅ Marked token #${served.tokenNumber} as SERVED in database`);
      }
    } catch (err) {
      console.error('[Queue] Unexpected error:', err.message);
    }
  }
  
  res.json({ success: true, data: served || { message: 'No patient currently serving' } });
});

router.get('/served-patients', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('prescriptions')
      .select('token_number')
      .eq('status', 'SERVED')
      .gte('created_at', today)
      .lt('created_at', tomorrowStr);

    if (error) {
      console.error('[Queue] Error fetching served patients:', error.message);
      res.json({ success: false, data: [] });
    } else {
      const servedTokens = data.map(row => row.token_number);
      res.json({ success: true, data: servedTokens });
    }
  } catch (err) {
    console.error('[Queue] Unexpected error:', err.message);
    res.json({ success: false, data: [] });
  }
});

router.post('/reset', async (req, res) => {
  try {
    // Reset queue state in database
    const { error } = await supabase
      .from('prescriptions')
      .update({ status: 'WAITING', served_at: null })
      .neq('status', 'SERVED'); // Keep served as is, reset others to waiting

    if (error) {
      console.error('[Queue] Error resetting queue:', error.message);
    } else {
      console.log('[Queue] Queue reset in database');
    }

    // Reset in-memory
    const { resetQueue } = await import('../agents/queueAgent.js');
    resetQueue();
    servedPatients.clear();
    
    res.json({ success: true, message: 'Queue reset' });
  } catch (err) {
    console.error('[Queue] Unexpected error:', err.message);
    res.json({ success: false, message: 'Error resetting queue' });
  }
});

export default router;
