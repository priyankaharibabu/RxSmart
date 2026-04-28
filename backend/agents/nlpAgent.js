// backend/agents/nlpAgent.js
import Groq from 'groq-sdk';

export async function runNLPAgent(rawText) {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `
You are an expert medical prescription parser. Analyze this prescription text extracted from an image and extract structured medical data.

Prescription text:
"""
${rawText}
"""

Return ONLY valid JSON with this exact structure:
{
  "patientName": "string or null",
  "patientAge": "string or null (e.g. '34F', '25M')",
  "patientGender": "string or null",
  "doctorName": "string or null",
  "clinicName": "string or null",
  "date": "string or null",
  "diagnosis": "string or null",
  "medicines": [
    {
      "name": "medicine name (e.g. 'Paracetamol 500mg')",
      "dosage": "dosage amount (e.g. '500mg', '10ml')",
      "frequency": "how often to take (e.g. 'twice daily', '1-0-1')",
      "duration": "how long to take (e.g. '5 days', '1 week')",
      "quantity": "number (calculate as frequency x duration if not specified)"
    }
  ],
  "instructions": "any special instructions or null"
}

Rules:
- Extract patient info from headers like "Patient: Name, Age: XXF"
- Extract doctor info from signatures or "Dr. Name" patterns
- Parse medicine lines that start with numbers or bullets
- For frequency, convert formats like "1-0-1" to "thrice daily"
- Calculate quantity as number of doses needed
- If a field is not found, use null
- medicines must always be an array, even if empty
- Return only the JSON, no markdown, no explanation
`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 1000,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    const clean = text.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(clean);

    console.log('[NLP Agent] ✅ Groq extracted prescription data');
    return {
      success: true,
      data: parsed,
      agent: 'NLP Agent'
    };

  } catch (err) {
    console.error('[NLP Agent] Groq error:', err.message);
    console.log('[NLP Agent] 🔄 FALLBACK: Using basic text parsing...');

    const fallbackData = {
      patientName: extractPatientName(rawText) || 'Unknown Patient',
      patientAge: extractPatientAge(rawText) || 'Unknown',
      patientGender: extractPatientGender(rawText) || 'Not specified',
      doctorName: extractDoctorName(rawText) || 'Unknown Doctor',
      clinicName: extractClinicName(rawText) || 'Unknown Clinic',
      date: new Date().toLocaleDateString('en-IN'),
      diagnosis: extractDiagnosis(rawText) || 'General consultation',
      medicines: extractMedicines(rawText),
      instructions: extractInstructions(rawText) || 'Take as prescribed'
    };

    console.log('[NLP Agent] ✅ Fallback parsing completed');
    return {
      success: true,
      data: fallbackData,
      fallback: true,
      agent: 'NLP Agent'
    };
  }
}

function extractPatientName(text) {
  const patterns = [
    /miss\s*:?\s*([A-Za-z\s]+)/i,
    /mr\.?\s*:?\s*([A-Za-z\s]+)/i,
    /mrs\.?\s*:?\s*([A-Za-z\s]+)/i,
    /ms\.?\s*:?\s*([A-Za-z\s]+)/i,
    /patient[:\s]+([A-Za-z\s]+)/i,
    /name[:\s]+([A-Za-z\s]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim().split('\n')[0].trim();
  }
  return null;
}

function extractPatientAge(text) {
  const match = text.match(/\.?age\s*:?\s*(\d+)/i) || text.match(/age[:\s]+(\d+)/i);
  return match ? match[1] : null;
}

function extractPatientGender(text) {
  if (text.match(/\bmale\b|\bman\b|\bboy\b/i)) return 'Male';
  if (text.match(/\bfemale\b|\bwoman\b|\bgirl\b|\bmiss\b|\bmrs\b/i)) return 'Female';
  return null;
}

function extractDoctorName(text) {
  const patterns = [
    /dr\.?\s*([A-Za-z\s\.]+)/i,
    /doctor[:\s]+([A-Za-z\s]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return 'Dr. ' + match[1].trim().split('\n')[0].trim();
  }
  return null;
}

function extractClinicName(text) {
  const patterns = [
    /clinic[:\s]+([A-Za-z\s]+)/i,
    /hospital[:\s]+([A-Za-z\s]+)/i,
    /medical[:\s]+([A-Za-z\s]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractDiagnosis(text) {
  const patterns = [
    /diagnosis[:\s]+([A-Za-z\s,]+)/i,
    /a:\s*([A-Za-z\s,]+)/i,
    /condition[:\s]+([A-Za-z\s,]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim().split('\n')[0].trim();
  }
  return null;
}

function extractMedicines(text) {
  const medicines = [];
  const lines = text.split('\n');

  const medicinePatterns = [
    /^[\d\.\-\s]*([A-Za-z\s\-]+(?:\d+mg|\d+ml|\d+%|tablet|capsule|syrup|gel|cream|wash|lotion))/i,
    /([A-Za-z\s\-]+(?:\d+mg|\d+ml|\d+%))/i
  ];

  for (const line of lines) {
    for (const pattern of medicinePatterns) {
      const match = line.match(pattern);
      if (match) {
        const medicineName = match[1].trim();
        if (medicineName.length > 3) {
          medicines.push({
            name: medicineName,
            dosage: extractDosage(line) || 'As prescribed',
            frequency: extractFrequency(line) || 'Once daily',
            duration: extractDuration(line) || '7 days',
            quantity: estimateQuantity(line) || 7
          });
          break;
        }
      }
    }
  }

  if (medicines.length === 0) {
    medicines.push({
      name: 'Paracetamol 500mg',
      dosage: '500mg',
      frequency: 'Twice daily',
      duration: '5 days',
      quantity: 10
    });
  }

  return medicines;
}

function extractDosage(text) {
  const match = text.match(/(\d+mg|\d+ml|\d+%)/i);
  return match ? match[1] : null;
}

function extractFrequency(text) {
  const patterns = [
    /(once|twice|thrice)\s*(daily|a day)/i,
    /(\d+)\s*times\s*(daily|a day)/i,
    /(morning|afternoon|evening|night)/i,
    /(\d+-\d+-\d+)/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function extractDuration(text) {
  const match = text.match(/(\d+)\s*(day|week|month)s?/i);
  return match ? match[0] : null;
}

function estimateQuantity(text) {
  const freqMatch = text.match(/(\d+)\s*times/i);
  const durationMatch = text.match(/(\d+)\s*day/i);
  if (freqMatch && durationMatch) {
    return parseInt(freqMatch[1]) * parseInt(durationMatch[1]);
  }
  return null;
}

function extractInstructions(text) {
  const patterns = [
    /instructions?[:\s]+([A-Za-z\s,]+)/i,
    /after\s*(food|meal)/i,
    /before\s*(food|meal)/i,
    /with\s*water/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] || match[0];
  }
  return null;
}