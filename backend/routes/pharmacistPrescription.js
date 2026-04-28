import express from 'express';
import supabase from '../lib/supabaseClient.js';
import { runNotificationAgent } from '../agents/notificationAgent.js';

const router = express.Router();

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'served') return 'served';
  return 'pending';
}

function parseBill(bill) {
  if (!bill) return {};
  if (typeof bill === 'object') return bill;
  if (typeof bill === 'string') {
    try {
      return JSON.parse(bill);
    } catch {
      return {};
    }
  }
  return {};
}

function amountFromBill(bill) {
  const parsedBill = parseBill(bill);
  const amount = parsedBill?.pricing?.grandTotal ?? parsedBill?.totalAmount ?? 0;
  return Number(amount) || 0;
}

router.get('/queue', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .in('status', ['pending', 'served', 'PENDING', 'SERVED', 'WAITING', 'SERVING'])
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    const prescriptions = (data || []).map((row) => ({
      id: row.id,
      tokenNumber: row.token_number || null,
      patientName: row.patient_name || 'Unknown Patient',
      patientEmail: row.patient_email || null,
      patientId: row.patient_id || null,
      medicines: Array.isArray(row.medicines) ? row.medicines : [],
      bill: parseBill(row.bill),
      totalAmount: amountFromBill(row.bill),
      status: normalizeStatus(row.status),
      createdAt: row.created_at,
      servedAt: row.served_at || null
    }));

    res.json({ success: true, prescriptions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id/mark-served', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: rows, error: fetchError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (fetchError) {
      return res.status(500).json({ success: false, error: fetchError.message });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prescription not found' });
    }

    const row = rows[0];
    const { error: updateError } = await supabase
      .from('prescriptions')
      .update({
        status: 'served',
        served_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    let patientEmail = row.patient_email || null;
    if (!patientEmail && row.patient_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', row.patient_id)
        .single();
      patientEmail = userData?.email || null;
    }

    const bill = parseBill(row.bill);
    const queue = { position: 0, estimatedWaitMinutes: 0 };
    const notificationResult = await runNotificationAgent({
      patientEmail,
      patientName: row.patient_name || 'Patient',
      tokenNumber: row.token_number || '-',
      bill,
      queue
    });

    res.json({
      success: true,
      message: 'Marked as served',
      notification: notificationResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, error: 'email query is required' });
    }

    let patientId = null;
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    patientId = userData?.id || null;

    let query = supabase
      .from('prescriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.or(`patient_email.eq.${email},patient_id.eq.${patientId}`);
    } else {
      query = query.eq('patient_email', email);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    const history = (data || []).map((row) => ({
      id: row.id,
      tokenNumber: row.token_number || null,
      patientName: row.patient_name || 'Patient',
      patientEmail: row.patient_email || null,
      medicines: Array.isArray(row.medicines) ? row.medicines : [],
      bill: parseBill(row.bill),
      totalAmount: amountFromBill(row.bill),
      status: normalizeStatus(row.status),
      createdAt: row.created_at,
      servedAt: row.served_at || null
    }));

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
