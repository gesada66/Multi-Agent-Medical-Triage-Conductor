import { LlmProvider, ChatMessage } from '../../adapters/llm/types';
import { CachedPromptTemplates } from '../prompts/CachedPromptTemplates';
import { ClinicalEvidence } from '../../schemas';
import { logger } from '../../logger';
import { z } from 'zod';

export class SymptomParserAgent {
  private provider: LlmProvider;
  private systemPrompt: ChatMessage;

  constructor(provider: LlmProvider) {
    this.provider = provider;
    const cachedPrompt = CachedPromptTemplates.getCachedSystemPrompt('SymptomParserAgent');
    if (!cachedPrompt) {
      throw new Error('SymptomParser system prompt not found');
    }
    this.systemPrompt = cachedPrompt;
  }

  async parseSymptoms(
    symptomText: string, 
    patientId: string, 
    additionalContext?: {
      patientAge?: number;
      patientGender?: string;
      existingConditions?: string[];
    }
  ): Promise<{
    evidence: any;
    confidence: number;
    clarifyingQuestions?: string[];
  }> {
    try {
      logger.info('Parsing symptoms', { 
        patientId, 
        symptomLength: symptomText.length,
        hasAdditionalContext: !!additionalContext 
      });

      // Construct the parsing request with medical context
      const parsingRequest = this.buildParsingRequest(symptomText, patientId, additionalContext);

      // Use cost-optimized provider (Haiku with caching)
      const response = await this.provider.chat([
        this.systemPrompt,
        { role: 'user', content: parsingRequest }
      ], {
        temperature: 0.1, // Low temperature for medical accuracy
        maxTokens: 2000
      });

      // Parse and validate the AI-generated medical logic
      const parsedResult = await this.parseAndValidateResponse(response);

      logger.info('Symptom parsing completed', {
        patientId,
        confidence: parsedResult.confidence,
        extractedFeatures: Object.keys(parsedResult.evidence.features || {}),
        redFlagsDetected: parsedResult.evidence.features?.redFlags?.length || 0
      });

      return parsedResult;

    } catch (error) {
      logger.error('Symptom parsing failed', { 
        patientId, 
        error: error.message 
      });
      throw new Error(`Symptom parsing failed: ${error.message}`);
    }
  }

  private buildParsingRequest(
    symptomText: string, 
    patientId: string, 
    context?: any
  ): string {
    return `
PATIENT ID: ${patientId}
SYMPTOM DESCRIPTION: "${symptomText}"

${context ? `
ADDITIONAL CONTEXT:
${context.patientAge ? `Age: ${context.patientAge}` : ''}
${context.patientGender ? `Gender: ${context.patientGender}` : ''}
${context.existingConditions ? `Known Conditions: ${context.existingConditions.join(', ')}` : ''}
` : ''}

TASK: Parse this symptom description into structured clinical evidence.

REQUIREMENTS:
1. Extract temporal information (onset, duration, progression)
2. Identify severity indicators (pain scales, descriptive terms)
3. Map anatomical locations and radiation patterns
4. Detect associated symptoms and context clues
5. Identify vital signs if mentioned
6. Flag potential red flags requiring immediate attention
7. Suggest appropriate SNOMED-CT codes where applicable
8. Generate clarifying questions if information is insufficient

OUTPUT FORMAT: Return valid JSON matching this schema:
{
  "evidence": {
    "patientId": "${patientId}",
    "presentingComplaint": "primary symptom in clinical terms",
    "features": {
      "onset": "ISO datetime or descriptive",
      "severity": "number 0-10 or null",
      "radiation": "description or null", 
      "associated": ["symptom1", "symptom2"],
      "vitals": {
        "bp": "systolic/diastolic or null",
        "hr": "number or null",
        "spo2": "percentage or null",
        "rr": "number or null",
        "temp": "celsius or null"
      },
      "redFlags": ["flag1", "flag2"]
    },
    "codes": [
      {
        "system": "SNOMED-CT",
        "code": "12345678",
        "term": "Medical term"
      }
    ],
    "meds": ["medication1", "medication2"],
    "allergies": ["allergy1", "allergy2"]
  },
  "confidence": 0.85,
  "clarifyingQuestions": ["Question 1?", "Question 2?"]
}

CLINICAL GUIDELINES:
- Use medical terminology appropriately
- Be conservative with red flag identification
- Prioritize patient safety in all interpretations
- Map common symptoms to standard medical codes
- Consider age and gender in clinical context
- Flag incomplete information requiring clarification

Generate intelligent medical reasoning based on clinical best practices.
`;
  }

  private async parseAndValidateResponse(response: string): Promise<{
    evidence: any;
    confidence: number;
    clarifyingQuestions?: string[];
  }> {
    try {
      // Extract JSON from AI response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate basic structure
      if (!parsed.evidence || !parsed.confidence) {
        throw new Error('Invalid response structure');
      }

      // Validate confidence score
      if (parsed.confidence < 0 || parsed.confidence > 1) {
        logger.warn('Invalid confidence score, adjusting', { 
          original: parsed.confidence 
        });
        parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
      }

      // Validate and sanitize medical data
      const sanitizedEvidence = this.sanitizeMedicalEvidence(parsed.evidence);

      return {
        evidence: sanitizedEvidence,
        confidence: parsed.confidence,
        clarifyingQuestions: parsed.clarifyingQuestions || []
      };

    } catch (error) {
      logger.error('Failed to parse AI response', { error: error.message });
      
      // Fallback: create basic evidence structure
      return {
        evidence: {
          patientId: 'unknown',
          presentingComplaint: 'Unable to parse symptoms',
          features: {
            redFlags: ['Parsing error - manual review required']
          }
        },
        confidence: 0.1,
        clarifyingQuestions: ['Could you please rephrase your symptoms?']
      };
    }
  }

  private sanitizeMedicalEvidence(evidence: any): any {
    // Ensure required fields exist
    const sanitized = {
      patientId: evidence.patientId || 'unknown',
      presentingComplaint: evidence.presentingComplaint || 'Unspecified complaint',
      features: {
        onset: evidence.features?.onset || null,
        severity: this.validateSeverity(evidence.features?.severity),
        radiation: evidence.features?.radiation || null,
        associated: Array.isArray(evidence.features?.associated) 
          ? evidence.features.associated 
          : [],
        vitals: this.sanitizeVitals(evidence.features?.vitals),
        redFlags: Array.isArray(evidence.features?.redFlags) 
          ? evidence.features.redFlags 
          : []
      },
      codes: Array.isArray(evidence.codes) ? evidence.codes : [],
      meds: Array.isArray(evidence.meds) ? evidence.meds : [],
      allergies: Array.isArray(evidence.allergies) ? evidence.allergies : []
    };

    return sanitized;
  }

  private validateSeverity(severity: any): number | null {
    if (typeof severity === 'number' && severity >= 0 && severity <= 10) {
      return severity;
    }
    return null;
  }

  private sanitizeVitals(vitals: any): any {
    if (!vitals || typeof vitals !== 'object') {
      return {};
    }

    return {
      bp: vitals.bp || null,
      hr: typeof vitals.hr === 'number' ? vitals.hr : null,
      spo2: typeof vitals.spo2 === 'number' ? vitals.spo2 : null,
      rr: typeof vitals.rr === 'number' ? vitals.rr : null,
      temp: typeof vitals.temp === 'number' ? vitals.temp : null
    };
  }

  // Method to get medical insights for debugging/validation
  async getMedicalInsights(symptomText: string): Promise<{
    commonCauses: string[];
    redFlagIndicators: string[];
    recommendedQuestions: string[];
  }> {
    const insightRequest = `
Provide medical insights for: "${symptomText}"

Return JSON with:
- commonCauses: Array of common medical causes
- redFlagIndicators: Array of concerning features to watch for
- recommendedQuestions: Array of follow-up questions to ask

Focus on evidence-based medical knowledge and patient safety.
`;

    try {
      const response = await this.provider.chat([
        { role: 'system', content: 'You are a medical knowledge assistant providing evidence-based clinical insights.' },
        { role: 'user', content: insightRequest }
      ], { temperature: 0.2 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Failed to get medical insights', { error: error.message });
    }

    return {
      commonCauses: [],
      redFlagIndicators: [],
      recommendedQuestions: []
    };
  }
}