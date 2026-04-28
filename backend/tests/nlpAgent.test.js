import 'dotenv/config';
import { runNLPAgent } from '../agents/nlpAgent.js';

const sampleText = `
Dr. John Smith
Apollo Clinic
Date: 27-04-2026

Patient: Priya, Age: 22F

Diagnosis: Fever and cold

Rx:
1. Paracetamol 500mg - twice daily for 5 days
2. Cetirizine 10mg - once daily for 3 days
3. Vitamin C 250mg - once daily for 7 days

Instructions: Take after food. Drink plenty of water.
`;

describe('nlpAgent', () => {
  test('returns success true', async () => {
    const result = await runNLPAgent(sampleText);
    expect(result.success).toBe(true);
  });

  test('result has data object', async () => {
    const result = await runNLPAgent(sampleText);
    expect(result.data).toBeDefined();
    expect(typeof result.data).toBe('object');
  });

  test('data has medicines array', async () => {
    const result = await runNLPAgent(sampleText);
    expect(Array.isArray(result.data.medicines)).toBe(true);
  });

  test('medicines array is not empty', async () => {
    const result = await runNLPAgent(sampleText);
    expect(result.data.medicines.length).toBeGreaterThan(0);
  });

  test('each medicine has a name', async () => {
    const result = await runNLPAgent(sampleText);
    result.data.medicines.forEach(med => {
      expect(med.name).toBeDefined();
      expect(typeof med.name).toBe('string');
    });
  });

  test('patient name is extracted', async () => {
    const result = await runNLPAgent(sampleText);
    expect(result.data.patientName).toBeDefined();
  });
});