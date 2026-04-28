// backend/agents/pdfAgent.js
import PDFDocument from 'pdfkit';

/**
 * pdfAgent
 * Generates a styled PDF bill from the billing result and returns it as a Buffer.
 *
 * @param {Object} billingResult  - Output from billingAgent (medicines, totals, GST, etc.)
 * @param {Object} patientInfo    - { name, tokenNumber, doctorName, date }
 * @returns {Promise<Buffer>}     - PDF file as a binary buffer
 */
export async function generatePDFBill(billingResult, patientInfo) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      const colors = {
        primary: "#6C63FF",
        dark: "#1a1a2e",
        text: "#333333",
        muted: "#666666",
        light: "#f5f5f5",
        white: "#ffffff",
        success: "#28a745",
      };

      // ─── HEADER BANNER ───────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 90).fill(colors.dark);

      doc
        .fillColor(colors.white)
        .fontSize(26)
        .font("Helvetica-Bold")
        .text("RxSmart", 50, 22);

      doc
        .fillColor(colors.primary)
        .fontSize(10)
        .font("Helvetica")
        .text("Multi-Agent Prescription Intelligence & Billing Platform", 50, 52);

      // Token badge (top-right)
      doc
        .fillColor(colors.primary)
        .roundedRect(doc.page.width - 160, 18, 110, 52, 8)
        .fill();

      doc
        .fillColor(colors.white)
        .fontSize(9)
        .font("Helvetica")
        .text("TOKEN NUMBER", doc.page.width - 155, 26, { width: 100, align: "center" });

      doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .text(`#${patientInfo.tokenNumber || "N/A"}`, doc.page.width - 155, 40, {
          width: 100,
          align: "center",
        });

      // ─── BILL TITLE ──────────────────────────────────────────────────
      doc.moveDown(2);
      doc
        .fillColor(colors.text)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("PHARMACY BILL", { align: "center" });

      doc
        .moveTo(50, doc.y + 6)
        .lineTo(doc.page.width - 50, doc.y + 6)
        .strokeColor(colors.primary)
        .lineWidth(1.5)
        .stroke();

      doc.moveDown(1.2);

      // ─── PATIENT & DOCTOR INFO ────────────────────────────────────────
      const infoTop = doc.y;
      const colLeft = 50;
      const colRight = 320;

      // Left column
      doc.fontSize(9).font("Helvetica").fillColor(colors.muted).text("PATIENT NAME", colLeft, infoTop);
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(colors.text)
        .text(patientInfo.name || "N/A", colLeft, infoTop + 14);

      doc.fontSize(9).font("Helvetica").fillColor(colors.muted).text("PRESCRIBED BY", colLeft, infoTop + 36);
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(colors.text)
        .text(patientInfo.doctorName || "N/A", colLeft, infoTop + 50);

      // Right column
      doc.fontSize(9).font("Helvetica").fillColor(colors.muted).text("DATE", colRight, infoTop);
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(colors.text)
        .text(patientInfo.date || new Date().toLocaleDateString("en-IN"), colRight, infoTop + 14);

      doc.fontSize(9).font("Helvetica").fillColor(colors.muted).text("BILL ID", colRight, infoTop + 36);
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(colors.text)
        .text(`RXSM-${Date.now().toString().slice(-8)}`, colRight, infoTop + 50);

      doc.y = infoTop + 78;

      // ─── MEDICINES TABLE ──────────────────────────────────────────────
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      const tableWidth = doc.page.width - 100;
      doc.rect(50, tableTop, tableWidth, 24).fill(colors.dark);

      const cols = {
        medicine: 55,
        dosage: 230,
        qty: 330,
        unitPrice: 390,
        total: 465,
      };

      doc.fillColor(colors.white).fontSize(9).font("Helvetica-Bold");
      doc.text("MEDICINE", cols.medicine, tableTop + 8);
      doc.text("DOSAGE", cols.dosage, tableTop + 8);
      doc.text("QTY", cols.qty, tableTop + 8);
      doc.text("UNIT PRICE", cols.unitPrice, tableTop + 8);
      doc.text("TOTAL", cols.total, tableTop + 8);

      // Table rows
      const medicines = billingResult.medicines || billingResult.items || [];
      let rowY = tableTop + 24;
      let rowIndex = 0;

      for (const item of medicines) {
        const isEven = rowIndex % 2 === 0;
        doc.rect(50, rowY, tableWidth, 22).fill(isEven ? colors.light : colors.white);

        const name = item.name || item.medicine || "Unknown";
        const dosage = item.dosage || item.dose || "-";
        const qty = item.quantity ?? item.qty ?? 1;
        const unitPrice = parseFloat(item.unitPrice ?? item.price ?? 0).toFixed(2);
        const total = parseFloat(item.total ?? item.amount ?? unitPrice * qty).toFixed(2);

        doc.fillColor(colors.text).fontSize(9).font("Helvetica");
        doc.text(name, cols.medicine, rowY + 7, { width: 170, ellipsis: true });
        doc.text(dosage, cols.dosage, rowY + 7, { width: 90 });
        doc.text(String(qty), cols.qty, rowY + 7);
        doc.text(`₹${unitPrice}`, cols.unitPrice, rowY + 7);
        doc.text(`₹${total}`, cols.total, rowY + 7);

        rowY += 22;
        rowIndex++;
      }

      // Table bottom border
      doc.moveTo(50, rowY).lineTo(50 + tableWidth, rowY).strokeColor(colors.primary).lineWidth(1).stroke();

      // ─── TOTALS SECTION ───────────────────────────────────────────────
      doc.y = rowY + 12;
      const totalsX = 360;
      const totalsValueX = 490;

      const subtotal = parseFloat(billingResult.subtotal ?? billingResult.subTotal ?? 0).toFixed(2);
      const gst = parseFloat(billingResult.gst ?? billingResult.tax ?? billingResult.gstAmount ?? 0).toFixed(2);
      const grandTotal = parseFloat(billingResult.total ?? billingResult.grandTotal ?? 0).toFixed(2);
      const gstRate = billingResult.gstRate ?? billingResult.gstPercent ?? 18;

      doc.fontSize(9).font("Helvetica").fillColor(colors.muted);

      doc.text("Subtotal:", totalsX, doc.y);
      doc.text(`₹${subtotal}`, totalsValueX, doc.y - doc.currentLineHeight(), { align: "right", width: 60 });
      doc.moveDown(0.5);

      doc.text(`GST (${gstRate}%):`, totalsX, doc.y);
      doc.text(`₹${gst}`, totalsValueX, doc.y - doc.currentLineHeight(), { align: "right", width: 60 });
      doc.moveDown(0.8);

      // Grand total box
      doc.rect(350, doc.y - 2, 205, 28).fill(colors.primary);
      doc
        .fillColor(colors.white)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("GRAND TOTAL:", 358, doc.y + 5);
      doc.text(`₹${grandTotal}`, totalsValueX, doc.y - doc.currentLineHeight(), {
        align: "right",
        width: 60,
      });

      doc.y += 36;

      // ─── VALIDATION BADGE ─────────────────────────────────────────────
      if (billingResult.validationStatus || billingResult.validated) {
        doc.moveDown(0.5);
        doc.rect(50, doc.y, 200, 24).fill(colors.success);
        doc
          .fillColor(colors.white)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text("✓ Drug Interactions Validated by RxSmart AI", 58, doc.y + 8);
        doc.y += 32;
      }

      // ─── FOOTER ───────────────────────────────────────────────────────
      const footerY = doc.page.height - 60;
      doc.rect(0, footerY, doc.page.width, 60).fill(colors.dark);
      doc
        .fillColor(colors.muted)
        .fontSize(8)
        .font("Helvetica")
        .text(
          "This is a computer-generated bill. RxSmart — Ragworks Academy Internship Project.",
          0,
          footerY + 14,
          { align: "center", width: doc.page.width }
        );
      doc
        .fillColor(colors.primary)
        .text("Powered by Claude AI + Multi-Agent Architecture", 0, footerY + 30, {
          align: "center",
          width: doc.page.width,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
