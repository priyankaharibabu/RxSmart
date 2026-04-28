import { v4 as uuidv4 } from 'uuid';

const GST_RATE = 0.12; // 12% GST on medicines in India
const PHARMACY_NAME = 'RxSmart Pharmacy';
const PHARMACY_ADDRESS = 'Anna Nagar, Chennai - 600040';
const PHARMACY_GSTIN = '33AABCR1234F1Z5';

// Global token counter for unique sequential numbers
let tokenCounter = 100; // Start from 100 for demo

export async function runBillingAgent(prescriptionData, inventoryData) {
  console.log('[Billing Agent] Generating bill...');

  const billId = `BILL-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
  const tokenNumber = ++tokenCounter; // Increment for unique sequential numbers
  
  const lineItems = inventoryData.medicines.map(med => ({
    name: med.name,
    brand: med.brand || 'Generic',
    dosage: med.dosage,
    quantity: med.quantity || 10,
    unit: med.unit || 'tablet',
    pricePerUnit: med.pricePerUnit || 0,
    totalPrice: med.totalPrice || 0,
    available: med.available,
    inventoryStatus: med.inventoryStatus
  }));

  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const gstAmount = subtotal * GST_RATE;
  const grandTotal = subtotal + gstAmount;
  const estimatedWaitMinutes = Math.max(3, lineItems.length * 2);

  const bill = {
    billId,
    tokenNumber,
    status: 'GENERATED',
    pharmacy: {
      name: PHARMACY_NAME,
      address: PHARMACY_ADDRESS,
      gstin: PHARMACY_GSTIN
    },
    patient: {
      name: prescriptionData.patientName || 'Patient',
      age: prescriptionData.patientAge || 'N/A'
    },
    doctor: {
      name: prescriptionData.doctorName || 'Dr. N/A',
      clinic: prescriptionData.clinicName || 'N/A'
    },
    prescription: {
      date: prescriptionData.date || new Date().toLocaleDateString('en-IN'),
      diagnosis: prescriptionData.diagnosis || 'General'
    },
    lineItems,
    pricing: {
      subtotal: Math.round(subtotal * 100) / 100,
      gstRate: GST_RATE * 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100
    },
    estimatedWaitMinutes,
    generatedAt: new Date().toISOString(),
    paymentStatus: 'PENDING'
  };

  console.log('[Billing Agent] Bill generated:', billId, '| Total: ₹', bill.pricing.grandTotal);

  return {
    success: true,
    data: bill,
    agent: 'Billing Agent'
  };
}
