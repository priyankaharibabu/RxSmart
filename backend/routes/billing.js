// backend/routes/billing.js
import express from 'express';
import { generatePDFBill } from '../agents/pdfAgent.js';
import supabase from '../lib/supabaseClient.js';

const router = express.Router();

// In-memory cache for fast PDF lookups (mirrors what's in Supabase)
let billingHistory = [];

/**
 * GET /api/billing/history
 * Fetches billing history from Supabase (falls back to in-memory)
 * Filters by today's date for dashboard metrics
 */
router.get('/history', async (req, res) => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .gte('created_at', today)
      .lt('created_at', tomorrowStr)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data });
  } catch (err) {
    console.error('[Billing] History fetch error:', err.message);
    // Fallback to in-memory (filter today's data)
    const today = new Date().toISOString().split('T')[0];
    const todayHistory = billingHistory.filter(item => 
      item.createdAt && item.createdAt.startsWith(today)
    );
    res.json({ success: true, data: todayHistory, source: 'memory' });
  }
});

/**
 * POST /api/billing/reset
 * Clears in-memory billing history (for testing)
 */
router.post('/reset', (req, res) => {
  billingHistory.length = 0; // Clear the array
  console.log('[Billing] In-memory history cleared');
  res.json({ success: true, message: 'Billing history reset' });
});

/**
 * GET /api/billing/download/:tokenNumber
 * Fetches bill from Supabase by token number and streams PDF
 */
router.get('/download/:tokenNumber', async (req, res) => {
  const { tokenNumber } = req.params;

  try {
    // Try Supabase first
    const { data: rows, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('token_number', parseInt(tokenNumber))
      .limit(1);

    let record = null;

    if (!error && rows && rows.length > 0) {
      // Map Supabase row → billing format
      const row = rows[0];
      record = {
        tokenNumber:  row.token_number,
        patientName:  row.patient_name,
        doctorName:   row.doctor_name,
        medicines:    row.medicines,
        ...row.bill,
      };
    } else {
      // Fallback to in-memory
      const mem = billingHistory.find(
        (b) => String(b.tokenNumber) === String(tokenNumber)
      );
      if (mem) record = mem;
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        error: `No billing record found for token #${tokenNumber}`,
      });
    }

    const patientInfo = {
      name:        record.patientName || record.patient?.name || 'Patient',
      tokenNumber: record.tokenNumber,
      doctorName:  record.doctorName || record.doctor?.name || 'Doctor',
      date:        record.date || new Date().toLocaleDateString('en-IN'),
    };

    const pdfBuffer = await generatePDFBill(record, patientInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="RxSmart-Bill-${tokenNumber}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('[Billing] PDF download error:', err.message);
    res.status(500).json({ success: false, error: 'PDF generation failed' });
  }
});

/**
 * POST /api/billing/preview  (for testing without a token)
 */
router.post('/preview', async (req, res) => {
  try {
    const { billingResult, patientInfo } = req.body;
    if (!billingResult) {
      return res.status(400).json({ success: false, error: 'billingResult is required' });
    }
    const info = patientInfo || {
      name: 'Test Patient', tokenNumber: 'T001',
      doctorName: 'Dr. Test',
      date: new Date().toLocaleDateString('en-IN'),
    };
    const pdfBuffer = await generatePDFBill(billingResult, info);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="RxSmart-Preview.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: 'PDF generation failed' });
  }
});

export default router;
export { billingHistory };


