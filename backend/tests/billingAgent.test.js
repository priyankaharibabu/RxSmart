import 'dotenv/config';
import { runBillingAgent } from '../agents/billingAgent.js';

const samplePrescription = {
  patientName: 'Test Patient',
  patientAge: '25',
  doctorName: 'Dr. Test',
  clinicName: 'Test Clinic',
  diagnosis: 'Fever',
  medicines: [
    { name: 'Paracetamol 500mg', dosage: '500mg', frequency: 'twice daily', duration: '5 days', quantity: 10 },
    { name: 'Vitamin C', dosage: '250mg', frequency: 'once daily', duration: '5 days', quantity: 5 }
  ]
};

const sampleInventoryData = {
  medicines: [
    { name: 'Paracetamol 500mg', dosage: '500mg', quantity: 10, pricePerUnit: 5, totalPrice: 50, available: true, inventoryStatus: 'IN_STOCK' },
    { name: 'Vitamin C', dosage: '250mg', quantity: 5, pricePerUnit: 8, totalPrice: 40, available: true, inventoryStatus: 'IN_STOCK' }
  ]
};

describe('billingAgent', () => {
  test('returns success true', async () => {
    const result = await runBillingAgent(samplePrescription, sampleInventoryData);
    expect(result.success).toBe(true);
  });

  test('result has data object', async () => {
    const result = await runBillingAgent(samplePrescription, sampleInventoryData);
    expect(result.data).toBeDefined();
    expect(typeof result.data).toBe('object');
  });

  test('data has lineItems array', async () => {
    const result = await runBillingAgent(samplePrescription, sampleInventoryData);
    expect(Array.isArray(result.data.lineItems)).toBe(true);
    expect(result.data.lineItems.length).toBeGreaterThan(0);
  });

  test('tokenNumber exists and is a number', async () => {
    const result = await runBillingAgent(samplePrescription, sampleInventoryData);
    expect(result.data.tokenNumber).toBeDefined();
    expect(typeof result.data.tokenNumber).toBe('number');
  });

  test('pricing has grandTotal', async () => {
    const result = await runBillingAgent(samplePrescription, sampleInventoryData);
    expect(result.data.pricing).toBeDefined();
    expect(result.data.pricing.grandTotal).toBeGreaterThan(0);
  });

  test('result has agent property', async () => {
    const result = await runBillingAgent(samplePrescription, sampleInventoryData);
    expect(result.agent).toBe('Billing Agent');
  });
});