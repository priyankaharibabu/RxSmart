import 'dotenv/config';
import { runOCRAgent } from '../agents/ocrAgent.js';

describe('ocrAgent', () => {
  test('returns success false when no file path given', async () => {
    const result = await runOCRAgent(null, null);
    expect(result.success).toBe(false);
  });

  test('returns success false when file does not exist', async () => {
    const result = await runOCRAgent('./uploads/nonexistent-file.jpg', null);
    expect(result.success).toBe(false);
  });

  test('returns error message when file not found', async () => {
    const result = await runOCRAgent('./uploads/nonexistent-file.jpg', null);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  });

  test('returns success true when direct text input given', async () => {
    const result = await runOCRAgent(null, 'Patient: John, Medicine: Paracetamol 500mg twice daily for 5 days');
    expect(result.success).toBe(true);
  });

  test('returned rawText matches direct text input', async () => {
    const inputText = 'Patient: John, Medicine: Paracetamol 500mg twice daily for 5 days';
    const result = await runOCRAgent(null, inputText);
    expect(result.rawText).toBe(inputText);
  });

  test('confidence is 1.0 for direct text input', async () => {
    const result = await runOCRAgent(null, 'Patient: John, Medicine: Paracetamol 500mg twice daily');
    expect(result.confidence).toBe(1.0);
  });

  test('source is text-input for direct text', async () => {
    const result = await runOCRAgent(null, 'Patient: John, Medicine: Paracetamol 500mg twice daily');
    expect(result.source).toBe('text-input');
  });
});