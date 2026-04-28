// backend/routes/prescription.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../lib/supabaseClient.js';
import { runOCRAgent }          from '../agents/ocrAgent.js';
import { runNLPAgent }          from '../agents/nlpAgent.js';
import { runValidationAgent }   from '../agents/validationAgent.js';
import { runInventoryAgent }    from '../agents/inventoryAgent.js';
import { runBillingAgent }      from '../agents/billingAgent.js';
import { runQueueAgent }        from '../agents/queueAgent.js';
import { runAuditAgent }        from '../agents/auditAgent.js';
import { runNotificationAgent } from '../agents/notificationAgent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

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
  const parsed = parseBill(bill);
  const amount = parsed?.pricing?.grandTotal ?? parsed?.totalAmount ?? parsed?.total ?? 0;
  return Number(amount) || 0;
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase() === 'served' ? 'served' : 'pending';
}

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    cb(null, `prescription-${Date.now()}-${uuidv4().slice(0, 8)}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|bmp|tiff|pdf/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only image files allowed'), ok);
  }
});

// ─── MAIN PIPELINE: Image Upload ─────────────────────────────────────────────
router.post('/process', upload.single('prescription'), async (req, res) => {
  const prescriptionId = `RX-${Date.now()}`;
  const agentLog = [];

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No prescription image uploaded' });
    }

    const imagePath    = req.file.path;
    const patientEmail = req.body.patientEmail || null;

    console.log('\n=== RxSmart Pipeline Started ===');
    console.log('Prescription ID:', prescriptionId);

    // Agent 1: OCR
    const ocrResult = await runOCRAgent(imagePath);
    agentLog.push({ agent: 'OCR Agent', status: ocrResult.success ? 'DONE' : 'FAILED', time: new Date().toISOString() });

    if (!ocrResult.success || !ocrResult.rawText) {
      return res.status(422).json({ success: false, error: 'Could not read prescription image', agentLog });
    }

    // Agent 2: NLP
    const nlpResult = await runNLPAgent(ocrResult.rawText);
    agentLog.push({ agent: 'NLP Agent', status: nlpResult.success ? 'DONE' : 'FAILED', time: new Date().toISOString() });

    if (!nlpResult.success || !nlpResult.data?.medicines?.length) {
      return res.status(422).json({ success: false, error: 'Could not extract prescription data', agentLog, rawText: ocrResult.rawText });
    }

    const prescriptionData = nlpResult.data;

    // Agent 3: Validation
    const validationResult = await runValidationAgent(prescriptionData.medicines, prescriptionData.patientAge);
    agentLog.push({ agent: 'Validation Agent', status: validationResult.success ? 'DONE' : 'WARNING', time: new Date().toISOString() });

    // Agent 4: Inventory
    const inventoryResult = await runInventoryAgent(prescriptionData.medicines);
    agentLog.push({ agent: 'Inventory Agent', status: inventoryResult.success ? 'DONE' : 'FAILED', time: new Date().toISOString() });

    // Agent 5: Billing
    const billingResult = await runBillingAgent(prescriptionData, inventoryResult.data);
    agentLog.push({ agent: 'Billing Agent', status: billingResult.success ? 'DONE' : 'FAILED', time: new Date().toISOString() });

    // Agent 6: Queue
    const queueResult = await runQueueAgent(billingResult.data);
    agentLog.push({ agent: 'Queue Agent', status: queueResult.success ? 'DONE' : 'FAILED', time: new Date().toISOString() });

    // Agent 7: Notification — DISABLED (notification sent only when pharmacist marks as served)
    agentLog.push({
      agent: 'Notification Agent',
      status: 'SKIPPED',
      reason: 'Sent only after pharmacist marks as served',
      time: new Date().toISOString()
    });

    // Save prescription to Supabase
    const prescriptionDataToSave = {
      patient_email: patientEmail,
      patient_name: prescriptionData.patientName || 'Patient',
      status: 'pending',
      medicines: prescriptionData.medicines || [],
      total_amount: amountFromBill(billingResult.data),
      token_number: queueResult.data?.tokenNumber || prescriptionId,
      bill: billingResult.data,
      created_date: new Date().toISOString()
    };

    const { data: savedPrescription, error: saveError } = await supabase
      .from('prescriptions')
      .insert(prescriptionDataToSave)
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save prescription to Supabase:', saveError);
      return res.status(500).json({ success: false, error: 'Failed to save prescription', agentLog });
    }

    // Agent 8: Audit — saves to Supabase
    const auditData = {
      ...billingResult.data,
      patientName: prescriptionData.patientName,
      doctorName: prescriptionData.doctorName,
      validation: validationResult.data,
      queue: queueResult.data,
      rawText: ocrResult.rawText
    };
    const auditResult = await runAuditAgent(prescriptionId, 'PRESCRIPTION_PROCESSED', auditData);
    agentLog.push({ agent: 'Audit Agent', status: auditResult.success ? 'DONE' : 'FAILED', time: new Date().toISOString() });

    console.log('=== Pipeline Complete ===\n');

    res.json({
      success: true,
      prescriptionId: savedPrescription.id,
      tokenNumber: savedPrescription.token_number,
      agentLog,
      results: {
        ocr:          { rawText: ocrResult.rawText, confidence: ocrResult.confidence },
        prescription: prescriptionData,
        validation:   validationResult.data,
        inventory:    inventoryResult.data,
        bill:         billingResult.data,
        queue:        queueResult.data,
        notification: { skipped: true, reason: 'Sent only after pharmacist marks as served' },
        audit:        auditResult.data,
      }
    });

  } catch (error) {
    console.error('Pipeline Error:', error);
    res.status(500).json({ success: false, error: error.message, agentLog });
  }
});

// ─── TEXT INPUT PIPELINE ──────────────────────────────────────────────────────
router.post('/process-text', async (req, res) => {
  const { rawText, patientEmail } = req.body;
  const prescriptionId = `RX-${Date.now()}`;
  const agentLog = [];

  try {
    if (!rawText) {
      return res.status(400).json({ success: false, error: 'No text provided' });
    }

    // Agent 2: NLP
    const nlpResult = await runNLPAgent(rawText);
    agentLog.push({ agent: 'NLP Agent', status: nlpResult.success ? 'DONE' : 'FAILED', time: new Date().toISOString() });

    if (!nlpResult.success) {
      return res.status(422).json({ success: false, error: 'Extraction failed', agentLog });
    }

    const prescriptionData = nlpResult.data;

    // Agent 3: Validation
    const validationResult = await runValidationAgent(prescriptionData.medicines, prescriptionData.patientAge);
    agentLog.push({ agent: 'Validation Agent', status: 'DONE', time: new Date().toISOString() });

    // Agent 4: Inventory
    const inventoryResult = await runInventoryAgent(prescriptionData.medicines);
    agentLog.push({ agent: 'Inventory Agent', status: 'DONE', time: new Date().toISOString() });

    // Agent 5: Billing
    const billingResult = await runBillingAgent(prescriptionData, inventoryResult.data);
    agentLog.push({ agent: 'Billing Agent', status: 'DONE', time: new Date().toISOString() });

    // Agent 6: Queue
    const queueResult = await runQueueAgent(billingResult.data);
    agentLog.push({ agent: 'Queue Agent', status: 'DONE', time: new Date().toISOString() });

    // Agent 7: Notification — DISABLED (notification sent only when pharmacist marks as served)
    agentLog.push({
      agent: 'Notification Agent',
      status: 'SKIPPED',
      reason: 'Sent only after pharmacist marks as served',
      time: new Date().toISOString()
    });

    // Save prescription to Supabase
    const prescriptionDataToSave = {
      patient_email: patientEmail,
      patient_name: prescriptionData.patientName || 'Patient',
      status: 'pending',
      medicines: prescriptionData.medicines || [],
      total_amount: amountFromBill(billingResult.data),
      token_number: queueResult.data?.tokenNumber || prescriptionId,
      bill: billingResult.data,
      created_date: new Date().toISOString()
    };

    const { data: savedPrescription, error: saveError } = await supabase
      .from('prescriptions')
      .insert(prescriptionDataToSave)
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save prescription to Supabase:', saveError);
      return res.status(500).json({ success: false, error: 'Failed to save prescription', agentLog });
    }

    // Agent 8: Audit
    const auditResult = await runAuditAgent(prescriptionId, 'TEXT_PROCESSED', billingResult.data);
    agentLog.push({ agent: 'Audit Agent', status: auditResult.success ? 'DONE' : 'FAILED', time: new Date().toISOString() });

    res.json({
      success: true,
      prescriptionId: savedPrescription.id,
      tokenNumber: savedPrescription.token_number,
      agentLog,
      results: {
        prescription: prescriptionData,
        validation:   validationResult.data,
        inventory:    inventoryResult.data,
        bill:         billingResult.data,
        queue:        queueResult.data,
        notification: { skipped: true, reason: 'Sent only after pharmacist marks as served' },
        audit:        auditResult.data,
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message, agentLog });
  }
});

router.get('/patient-history', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, error: 'email query is required' });
    }

    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .ilike('patient_email', email)
      .order('created_at', { ascending: false });

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
      servedAt: row.served_at || null,
    }));

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/today-stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .gte('created_at', startOfToday)
      .lt('created_at', startOfTomorrow);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    const stats = (data || []).reduce(
      (acc, row) => {
        const status = normalizeStatus(row.status);
        if (status === 'served') {
          acc.served += 1;
        } else {
          acc.pending += 1;
        }
        acc.total += 1;
        acc.revenue += amountFromBill(row.bill);
        return acc;
      },
      { pending: 0, served: 0, total: 0, revenue: 0 }
    );

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── MARK AS SERVED ─────────────────────────────────────────────────────────────
router.patch('/:id/mark-served', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Prescription ID is required' });
    }

    // First, get the prescription details to send notification
    const { data: prescription, error: fetchError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !prescription) {
      return res.status(404).json({ success: false, error: 'Prescription not found' });
    }

    // Update status to 'served' and set served_at timestamp
    const { data: updatedPrescription, error: updateError } = await supabase
      .from('prescriptions')
      .update({
        status: 'served',
        served_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // Send email notification to patient
    const billData = parseBill(prescription.bill);
    const notificationData = {
      patientEmail: prescription.patient_email,
      patientName: prescription.patient_name,
      tokenNumber: prescription.token_number,
      bill: billData,
      queue: {
        position: 0, // Already served, position 0
        estimatedWaitMinutes: 0 // Already served, no wait
      }
    };

    try {
      const notificationResult = await runNotificationAgent(notificationData);
      console.log('[MarkServed] Notification result:', notificationResult);
    } catch (notificationError) {
      console.error('[MarkServed] Failed to send notification:', notificationError.message);
      // Don't fail the operation if notification fails
    }

    res.json({
      success: true,
      message: 'Prescription marked as served successfully',
      prescription: updatedPrescription
    });

  } catch (error) {
    console.error('[MarkServed] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;