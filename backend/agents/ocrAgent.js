// backend/agents/ocrAgent.js
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function runOCRAgent(imagePath = null, rawTextInput = null) {
  console.log('[OCRAgent] Starting...');

  // ── Case 1: Direct text input — no OCR needed ─────────────────────────────
  if (rawTextInput && rawTextInput.trim().length > 0) {
    console.log('[OCRAgent] ✅ Direct text input received, skipping OCR');
    return {
      success: true,
      rawText: rawTextInput.trim(),
      confidence: 1.0,
      source: 'text-input'
    };
  }

  // ── Case 2: Image file — run OCR ──────────────────────────────────────────
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.error('[OCRAgent] ❌ File not found:', imagePath);
    return {
      success: false,
      rawText: '',
      confidence: 0,
      error: `Image file not found: ${imagePath}`
    };
  }

  console.log('[OCRAgent] File size:', fs.readFileSync(imagePath).length, 'bytes');

  // ── Try OCR.space first ───────────────────────────────────────────────────
  try {
    if (!process.env.OCR_SPACE_API_KEY) {
      throw new Error('OCR_SPACE_API_KEY not set');
    }

    console.log('[OCRAgent] Sending to OCR.space API...');

    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePath));
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');

    const response = await axios.post(
      'https://api.ocr.space/parse/image',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'apikey': process.env.OCR_SPACE_API_KEY
        }
      }
    );

    const result = response.data;

    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage?.[0] || 'OCR.space processing error');
    }

    const rawText = result.ParsedResults?.[0]?.ParsedText?.trim();

    if (!rawText || rawText.length < 10) {
      throw new Error('OCR.space returned empty text');
    }

    console.log('[OCRAgent] ✅ OCR.space success. Characters:', rawText.length);
    console.log('[OCRAgent] Preview:', rawText.substring(0, 300));

    return {
      success: true,
      rawText,
      confidence: 0.90,
      source: 'ocr-space'
    };

  } catch (ocrSpaceError) {
    console.error('[OCRAgent] ❌ OCR.space failed:', ocrSpaceError.message);

    // ── Try Gemini Vision as fallback ─────────────────────────────────────
    console.log('[OCRAgent] 🔄 Trying Gemini Vision fallback...');
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not set');
      }

      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = getMimeType(imagePath);

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `You are a medical OCR system. Extract ALL text from this prescription image exactly as written.
Include: patient name, age, doctor name, clinic, date, diagnosis, all medicine names, dosages, frequencies, durations, and any instructions.
Return ONLY the raw extracted text, nothing else. No commentary, no formatting, no markdown.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Image, mimeType } }
      ]);

      const rawText = result.response.text().trim();

      if (!rawText || rawText.length < 10) {
        throw new Error('Gemini returned empty text');
      }

      console.log('[OCRAgent] ✅ Gemini fallback success. Characters:', rawText.length);
      return {
        success: true,
        rawText,
        confidence: 0.95,
        source: 'gemini-vision'
      };

    } catch (geminiError) {
      console.error('[OCRAgent] ❌ Gemini fallback failed:', geminiError.message);
      return {
        success: false,
        rawText: '',
        confidence: 0,
        error: `OCR failed. OCR.space: ${ocrSpaceError.message} | Gemini: ${geminiError.message}`
      };
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.bmp':  'image/bmp',
    '.tiff': 'image/tiff',
    '.tif':  'image/tiff'
  };
  return map[ext] ?? 'image/jpeg';
}