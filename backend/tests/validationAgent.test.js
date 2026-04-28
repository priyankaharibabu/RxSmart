import 'dotenv/config';
import { runValidationAgent } from '../agents/validationAgent.js';

const sampleMedicines = [
  { name: 'Paracetamol 500mg', dosage: '500mg', frequency: 'twice daily', duration: '5 days', quantity: 10 },
  { name: 'Cetirizine 10mg', dosage: '10mg', frequency: 'once daily', duration: '3 days', quantity: 3 }
];

describe('validationAgent', () => {
  test('returns success true', async () => {
    const result = await runValidationAgent(sampleMedicines, '25');
    expect(result.success).toBe(true);
  });

  test('result has data object', async () => {
    const result = await runValidationAgent(sampleMedicines, '25');
    expect(result.data).toBeDefined();
    expect(typeof result.data).toBe('object');
  });

  test('data has some array property', async () => {
    const result = await runValidationAgent(sampleMedicines, '25');
    const hasArray = Array.isArray(result.data.warnings) ||
                     Array.isArray(result.data.interactions) ||
                     Array.isArray(result.data.validatedMedicines) ||
                     Array.isArray(result.data.medicines);
    expect(hasArray).toBe(true);
  });

  test('result has agent property', async () => {
    const result = await runValidationAgent(sampleMedicines, '25');
    expect(result.agent).toBeDefined();
  });

  test('works with empty medicines array', async () => {
    const result = await runValidationAgent([], '25');
    expect(result.success).toBe(true);
  });

  test('works without patient age', async () => {
    const result = await runValidationAgent(sampleMedicines, null);
    expect(result.success).toBe(true);
  });
});