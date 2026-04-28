// backend/agents/notificationAgent.js
import nodemailer from 'nodemailer';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function createEmailTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function validateEmailTransport(transporter) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('[NotificationAgent] Missing Gmail credentials in .env');
    return false;
  }

  try {
    await transporter.verify();
    return true;
  } catch (verifyError) {
    console.error('[NotificationAgent] Transport verification failed:', verifyError.message);
    return false;
  }
}

/**
 * notificationAgent
 * Sends a real Gmail email to the patient with their bill summary.
 *
 * @param {Object} params
 * @param {string} params.patientEmail  - Recipient email
 * @param {string} params.patientName   - Patient's name
 * @param {number} params.tokenNumber   - Queue token number
 * @param {Object} params.bill          - Bill object from billingAgent
 * @param {Object} params.queue         - Queue object from queueAgent
 * @returns {Object} - { success, messageId, error }
 */
export async function runNotificationAgent({ patientEmail, patientName, tokenNumber, bill, queue }) {
  try {
    patientEmail = normalizeEmail(patientEmail);
    if (!patientEmail) {
      console.log('[NotificationAgent] No patient email — skipping');
      return { success: false, skipped: true, reason: 'No email provided' };
    }

    if (!EMAIL_REGEX.test(patientEmail)) {
      console.error('[NotificationAgent] Invalid patient email format:', patientEmail);
      return { success: false, skipped: true, reason: 'Invalid email format' };
    }

    const transporter = createEmailTransport();
    const transportReady = await validateEmailTransport(transporter);
    if (!transportReady) {
      console.error('[NotificationAgent] Email transport is invalid. Falling back to log mode.');
      const failingMailOptions = {
        from: `"RxSmart Pharmacy" <${process.env.GMAIL_USER}>`,
        to: patientEmail,
        subject: `RxSmart — Your medicines are ready for collection`,
      };
      console.log('[NotificationAgent] 📧 FALLBACK: Logging email content for demo...');
      console.log('='.repeat(80));
      console.log(`TO: ${patientEmail}`);
      console.log(`SUBJECT: ${failingMailOptions.subject}`);
      console.log('CONTENT: transport invalid, email not sent');
      console.log('='.repeat(80));

      return {
        success: false,
        fallback: true,
        logged: true,
        reason: 'Transport not valid',
      };
    }

    const grandTotal = bill?.pricing?.grandTotal || bill?.total || '0';
    const waitMins   = queue?.estimatedWaitMinutes || '10-15';
    const position   = queue?.position || 1;
    const pharmacy   = bill?.pharmacy?.name || 'RxSmart Pharmacy';
    const medicines  = bill?.lineItems || bill?.medicines || [];

    // Build medicine rows for email table
    const medicineRows = medicines.map(m => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #2a2a3e;color:#e0e0e0">${m.name || m.medicine || 'N/A'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #2a2a3e;color:#a0a0b0">${m.dosage || '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #2a2a3e;color:#a0a0b0;text-align:center">${m.quantity || 1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #2a2a3e;color:#00d4aa;font-weight:600;text-align:right">₹${m.totalPrice || m.total || '0'}</td>
      </tr>
    `).join('');

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:20px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:16px 16px 0 0;padding:32px;text-align:center;border-bottom:2px solid #00d4aa">
      <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">Rx<span style="color:#00d4aa">Smart</span></div>
      <div style="font-size:12px;color:#6c6c8a;margin-top:4px;letter-spacing:1px;text-transform:uppercase">Prescription Intelligence Platform</div>
    </div>

    <!-- Token Banner -->
    <div style="background:#0d1f1c;border-left:4px solid #00d4aa;border-right:4px solid #00d4aa;padding:28px;text-align:center">
      <div style="font-size:12px;color:#00d4aa;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Your Token Number</div>
      <div style="font-size:64px;font-weight:800;color:#00d4aa;line-height:1">#${tokenNumber}</div>
      <div style="margin-top:16px">
        <table style="width:100%;text-align:center">
          <tr>
            <td>
              <div style="font-size:11px;color:#6c6c8a;text-transform:uppercase;letter-spacing:1px">Queue Position</div>
              <div style="font-size:18px;font-weight:700;color:#ffffff">#${position}</div>
            </td>
            <td>
              <div style="font-size:11px;color:#6c6c8a;text-transform:uppercase;letter-spacing:1px">Est. Wait</div>
              <div style="font-size:18px;font-weight:700;color:#ffffff">~${waitMins} mins</div>
            </td>
            <td>
              <div style="font-size:11px;color:#6c6c8a;text-transform:uppercase;letter-spacing:1px">Total</div>
              <div style="font-size:18px;font-weight:700;color:#00d4aa">₹${grandTotal}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Greeting -->
    <div style="background:#13131f;padding:24px 32px;border-left:4px solid #00d4aa;border-right:4px solid #00d4aa">
      <p style="color:#e0e0e0;font-size:15px;margin:0 0 8px">Dear <strong style="color:#ffffff">${patientName || 'Patient'}</strong>,</p>
      <p style="color:#a0a0b0;font-size:14px;margin:0;line-height:1.6">
        Your medicines are ready. Please collect from the pharmacy.
      </p>
      <p style="color:#a0a0b0;font-size:14px;margin:8px 0 0;line-height:1.6">
        Please show this token number at the counter: <strong style="color:#00d4aa">#${tokenNumber}</strong>
      </p>
    </div>

    <!-- Medicine Table -->
    <div style="background:#13131f;padding:0 32px 24px;border-left:4px solid #00d4aa;border-right:4px solid #00d4aa">
      <div style="font-size:11px;color:#6c6c8a;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:16px 0 12px;border-bottom:1px solid #2a2a3e">
        Medicines Prescribed
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px 12px;font-size:11px;color:#6c6c8a;font-weight:600;text-transform:uppercase;letter-spacing:1px">Medicine</th>
            <th style="text-align:left;padding:10px 12px;font-size:11px;color:#6c6c8a;font-weight:600;text-transform:uppercase;letter-spacing:1px">Dosage</th>
            <th style="text-align:center;padding:10px 12px;font-size:11px;color:#6c6c8a;font-weight:600;text-transform:uppercase;letter-spacing:1px">Qty</th>
            <th style="text-align:right;padding:10px 12px;font-size:11px;color:#6c6c8a;font-weight:600;text-transform:uppercase;letter-spacing:1px">Amount</th>
          </tr>
        </thead>
        <tbody>${medicineRows}</tbody>
      </table>

      <!-- Total -->
      <table style="width:100%;margin-top:16px">
        <tr>
          <td style="background:#0d1f1c;border-radius:10px;padding:16px">
            <table style="width:100%">
              <tr>
                <td style="color:#a0a0b0;font-size:14px">Grand Total (incl. GST)</td>
                <td style="color:#00d4aa;font-size:22px;font-weight:800;text-align:right">₹${grandTotal}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#1a1a2e;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;border-top:1px solid #2a2a3e">
      <p style="color:#6c6c8a;font-size:12px;margin:0">This is an automated email from RxSmart Pharmacy.</p>
    </div>

  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"RxSmart Pharmacy" <${process.env.GMAIL_USER}>`,
      to: patientEmail,
      subject: `RxSmart — Your medicines are ready for collection`,
      html: htmlBody,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[NotificationAgent] ✅ Email sent to ${patientEmail} — ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        sentTo: patientEmail,
      };
    } catch (emailError) {
      console.error('[NotificationAgent] ⚠️  Email send failed:', emailError.message);
      console.error('[NotificationAgent] Check GMAIL_USER and GMAIL_APP_PASSWORD in .env');
      console.log('[NotificationAgent] 📧 FALLBACK: Logging email content for demo...');
      console.log('='.repeat(80));
      console.log(`TO: ${patientEmail}`);
      console.log(`SUBJECT: ${mailOptions.subject}`);
      console.log('HTML CONTENT:');
      console.log(htmlBody);
      console.log('='.repeat(80));
      
      return {
        success: false,
        error: emailError.message,
        fallback: true,
        messageId: 'DEMO-' + Date.now(),
        sentTo: patientEmail,
        logged: true,
      };
    }

  } catch (err) {
    console.error('[NotificationAgent] Email error:', err.message);
    // Never crash the pipeline
    return { success: false, error: err.message };
  }
}