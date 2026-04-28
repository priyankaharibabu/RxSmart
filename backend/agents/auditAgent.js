// backend/agents/auditAgent.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * runAuditAgent
 * Saves the full prescription pipeline result to Supabase.
 * Falls back gracefully if DB insert fails — pipeline never breaks.
 */
export async function runAuditAgent(prescriptionId, eventType, billData) {
  try {
    const record = {
      prescription_id: prescriptionId || null,
      patient_name:    billData?.patient?.name || billData?.patientName || null,
      doctor_name:     billData?.doctor?.name || billData?.doctorName || null,
      token_number:    billData?.tokenNumber || null,
      medicines:       billData?.lineItems || billData?.medicines || [],
      validation:      billData?.validation || {},
      bill:            billData || {},
      queue:           billData?.queue || {},
      raw_text:        eventType || null,
      status:          'WAITING',
      created_at:      new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from('prescriptions')
      .insert([record])
      .select()
      .single();

    if (error) {
      console.error('[AuditAgent] Supabase insert error:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`[AuditAgent] ✅ Saved to Supabase — ID: ${inserted.id}`);
    return { success: true, data: inserted };

  } catch (err) {
    console.error('[AuditAgent] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}