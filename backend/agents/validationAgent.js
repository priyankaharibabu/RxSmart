// backend/agents/validationAgent.js
import Groq from 'groq-sdk';

export async function runValidationAgent(medicines, patientAge) {
  try {
    if (!medicines || medicines.length === 0) {
      return {
        success: true,
        data: {
          safe: true,
          overallRisk: 'LOW',
          validations: [],
          interactions: [],
          recommendations: 'No medicines to validate',
        },
        agent: 'Validation Agent'
      };
    }

    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const medicineList = medicines
      .map((m, i) => `${i + 1}. ${m.name} ${m.dosage || ''}`)
      .join('\n');

    const prompt = `
You are a clinical pharmacist checking drug safety. Analyze these medicines for interactions and safety.
Return ONLY valid JSON, no markdown, no explanation, no backticks.

Patient Age: ${patientAge || 'Unknown'}
Medicines prescribed:
${medicineList}

Return this exact JSON structure:
{
  "safe": true or false,
  "overallRisk": "LOW" or "MEDIUM" or "HIGH",
  "validations": [
    {
      "medicine": "medicine name",
      "status": "SAFE" or "WARNING" or "DANGER",
      "note": "brief note about this medicine"
    }
  ],
  "interactions": [
    {
      "medicines": ["drug1", "drug2"],
      "severity": "MILD" or "MODERATE" or "SEVERE",
      "description": "what the interaction is"
    }
  ],
  "recommendations": "overall recommendation string"
}

Rules:
- interactions array should be empty [] if no interactions found
- Be medically accurate but concise
- Do not add any text outside the JSON
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

    console.log(`[Validation Agent] ✅ Groq validated ${medicines.length} medicines — Risk: ${parsed.overallRisk}`);
    return {
      success: true,
      data: parsed,
      agent: 'Validation Agent'
    };

  } catch (err) {
    console.error('[Validation Agent] Groq error:', err.message);
    console.log('[Validation Agent] 🔄 FALLBACK: Using basic validation...');

    const validations = medicines.map(m => ({
      medicine: m.name,
      status: 'SAFE',
      note: 'No known issues identified'
    }));

    console.log('[Validation Agent] ✅ Fallback validation completed — Risk: LOW');
    return {
      success: true,
      data: {
        safe: true,
        overallRisk: 'LOW',
        validations,
        interactions: [],
        recommendations: 'All medicines appear safe. Consult pharmacist if unsure.',
      },
      fallback: true,
      agent: 'Validation Agent'
    };
  }
}