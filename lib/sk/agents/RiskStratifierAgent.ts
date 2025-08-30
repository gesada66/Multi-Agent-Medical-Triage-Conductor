import { LlmProvider, ChatMessage } from '../../adapters/llm/types';
import { CachedPromptTemplates } from '../prompts/CachedPromptTemplates';
import { logger } from '../../logger';

export class RiskStratifierAgent {
  private provider: LlmProvider;
  private systemPrompt: ChatMessage;

  constructor(provider: LlmProvider) {
    this.provider = provider;
    const cachedPrompt = CachedPromptTemplates.getCachedSystemPrompt('RiskStratifierAgent');
    if (!cachedPrompt) {
      throw new Error('RiskStratifier system prompt not found');
    }
    this.systemPrompt = cachedPrompt;
  }

  async assessRisk(
    clinicalEvidence: any,
    patientContext?: {
      age?: number;
      comorbidities?: string[];
      medications?: string[];
    }
  ): Promise<{
    risk: {
      band: 'immediate' | 'urgent' | 'routine';
      pUrgent: number;
      explain: string[];
      requiredInvestigations?: string[];
      differentials?: string[];
    };
    confidence: number;
    reasoning: string[];
  }> {
    try {
      logger.info('Assessing medical risk', {
        patientId: clinicalEvidence.patientId,
        presentingComplaint: clinicalEvidence.presentingComplaint,
        redFlags: clinicalEvidence.features?.redFlags?.length || 0,
        hasVitals: !!clinicalEvidence.features?.vitals
      });

      // Build comprehensive risk assessment request
      const riskRequest = this.buildRiskAssessmentRequest(clinicalEvidence, patientContext);

      // Use smart routing - this may use Sonnet for complex medical reasoning
      const response = await this.provider.chat([
        this.systemPrompt,
        { role: 'user', content: riskRequest }
      ], {
        temperature: 0.05, // Very low temperature for medical safety
        maxTokens: 2500
      });

      const riskAssessment = await this.parseAndValidateRiskResponse(response);

      // Apply clinical safety filters
      const validatedAssessment = this.applyClinicalSafetyRules(
        riskAssessment, 
        clinicalEvidence
      );

      logger.info('Risk assessment completed', {
        patientId: clinicalEvidence.patientId,
        riskBand: validatedAssessment.risk.band,
        confidence: validatedAssessment.confidence,
        redFlagsTriggered: clinicalEvidence.features?.redFlags?.length || 0
      });

      return validatedAssessment;

    } catch (error) {
      logger.error('Risk assessment failed', { 
        patientId: clinicalEvidence.patientId,
        error: error.message 
      });
      
      // Fail-safe: Default to urgent for safety
      return this.createFailsafeAssessment(clinicalEvidence);
    }
  }

  private buildRiskAssessmentRequest(
    evidence: any, 
    context?: any
  ): string {
    return `
CLINICAL EVIDENCE:
Patient ID: ${evidence.patientId}
Chief Complaint: ${evidence.presentingComplaint}

SYMPTOM FEATURES:
- Onset: ${evidence.features?.onset || 'Not specified'}
- Severity: ${evidence.features?.severity || 'Not specified'}/10
- Radiation: ${evidence.features?.radiation || 'None specified'}
- Associated Symptoms: ${evidence.features?.associated?.join(', ') || 'None'}
- Red Flags Identified: ${evidence.features?.redFlags?.join(', ') || 'None'}

VITAL SIGNS:
- Blood Pressure: ${evidence.features?.vitals?.bp || 'Not recorded'}
- Heart Rate: ${evidence.features?.vitals?.hr || 'Not recorded'} bpm
- SpO2: ${evidence.features?.vitals?.spo2 || 'Not recorded'}%
- Respiratory Rate: ${evidence.features?.vitals?.rr || 'Not recorded'} /min
- Temperature: ${evidence.features?.vitals?.temp || 'Not recorded'}°C

MEDICATIONS: ${evidence.meds?.join(', ') || 'None listed'}
ALLERGIES: ${evidence.allergies?.join(', ') || 'None listed'}

${context ? `
PATIENT CONTEXT:
- Age: ${context.age || 'Not specified'}
- Comorbidities: ${context.comorbidities?.join(', ') || 'None listed'}
- Current Medications: ${context.medications?.join(', ') || 'None listed'}
` : ''}

TASK: Perform comprehensive medical risk stratification.

APPLY THESE CLINICAL DECISION RULES:

1. IMMEDIATE RISK (Red Flags):
   - Chest pain >15min with diaphoresis/nausea/radiation to arm/jaw
   - Severe headache with neurological deficits/vision changes
   - Difficulty breathing with altered mental status
   - Active suicidal ideation with plan/means
   - Signs of sepsis (fever + altered mental state + hypotension)
   - Anaphylaxis symptoms
   - Severe trauma mechanisms

2. URGENT RISK (High Priority):
   - Chest pain without immediate red flags but with cardiac risk factors
   - Persistent severe pain (>7/10) any location
   - Moderate breathing difficulty without immediate distress
   - Significant vital sign abnormalities
   - New neurological symptoms
   - Suspected fractures or dislocations

3. ROUTINE RISK (Standard Priority):
   - Mild-moderate symptoms (<6/10 severity)
   - Stable vital signs
   - No red flag features
   - Chronic conditions without acute changes
   - Minor injuries

CALCULATE RISK SCORE:
- Red flags present = IMMEDIATE (pUrgent = 0.9-1.0)
- High-risk features = URGENT (pUrgent = 0.6-0.89)
- Standard features = ROUTINE (pUrgent = 0.0-0.59)

Factor in:
- Age-related risk modifications
- Comorbidity impact
- Vital signs deviation from normal
- Pain severity and character
- Associated symptoms significance

OUTPUT REQUIRED JSON:
{
  "risk": {
    "band": "immediate|urgent|routine",
    "pUrgent": 0.85,
    "explain": [
      "Clinical reasoning point 1",
      "Clinical reasoning point 2"
    ],
    "requiredInvestigations": [
      "ECG", "Chest X-ray", "Blood tests"
    ],
    "differentials": [
      "Primary differential diagnosis",
      "Secondary consideration"
    ]
  },
  "confidence": 0.92,
  "reasoning": [
    "Step 1: Red flag analysis",
    "Step 2: Risk factor weighting",
    "Step 3: Clinical decision rationale"
  ]
}

MEDICAL SAFETY REQUIREMENTS:
- Be conservative with risk assessment
- Prioritize patient safety over efficiency
- Document clear clinical reasoning
- Consider worst-case scenarios for ambiguous presentations
- Ensure all red flags are properly weighted
- Use evidence-based medical guidelines

Apply sound clinical judgment and evidence-based medical decision making.
`;
  }

  private async parseAndValidateRiskResponse(response: string): Promise<any> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in risk response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required structure
      if (!parsed.risk || !parsed.confidence) {
        throw new Error('Missing required risk assessment fields');
      }

      // Validate risk band
      const validBands = ['immediate', 'urgent', 'routine'];
      if (!validBands.includes(parsed.risk.band)) {
        logger.warn('Invalid risk band, defaulting to urgent', { 
          originalBand: parsed.risk.band 
        });
        parsed.risk.band = 'urgent';
      }

      // Validate probability score
      if (typeof parsed.risk.pUrgent !== 'number' || 
          parsed.risk.pUrgent < 0 || 
          parsed.risk.pUrgent > 1) {
        logger.warn('Invalid pUrgent score, calculating from band', {
          original: parsed.risk.pUrgent,
          band: parsed.risk.band
        });
        parsed.risk.pUrgent = this.calculateProbabilityFromBand(parsed.risk.band);
      }

      // Ensure explanation exists
      if (!Array.isArray(parsed.risk.explain)) {
        parsed.risk.explain = ['Risk assessment completed'];
      }

      return parsed;

    } catch (error) {
      logger.error('Failed to parse risk response', { error: error.message });
      throw new Error('Invalid risk assessment response format');
    }
  }

  private applyClinicalSafetyRules(assessment: any, evidence: any): any {
    // Clinical safety overrides
    const redFlags = evidence.features?.redFlags || [];
    
    // Force immediate if critical red flags present
    const criticalRedFlags = [
      'crushing chest pain',
      'worst headache of life',
      'difficulty breathing',
      'suicidal ideation',
      'anaphylaxis',
      'severe trauma'
    ];

    const hasCriticalRedFlag = redFlags.some((flag: string) =>
      criticalRedFlags.some(critical => 
        flag.toLowerCase().includes(critical.toLowerCase())
      )
    );

    if (hasCriticalRedFlag && assessment.risk.band !== 'immediate') {
      logger.warn('Overriding risk assessment due to critical red flags', {
        originalBand: assessment.risk.band,
        redFlags: redFlags
      });
      
      assessment.risk.band = 'immediate';
      assessment.risk.pUrgent = 0.95;
      assessment.risk.explain.unshift('Critical red flag detected - immediate attention required');
    }

    // Validate severity vs risk band consistency
    const severity = evidence.features?.severity;
    if (severity >= 8 && assessment.risk.band === 'routine') {
      logger.warn('High severity with routine risk - upgrading to urgent', {
        severity,
        originalBand: assessment.risk.band
      });
      assessment.risk.band = 'urgent';
      assessment.risk.pUrgent = Math.max(0.7, assessment.risk.pUrgent);
    }

    return assessment;
  }

  private calculateProbabilityFromBand(band: string): number {
    switch (band) {
      case 'immediate': return 0.95;
      case 'urgent': return 0.75;
      case 'routine': return 0.25;
      default: return 0.75; // Default to urgent for safety
    }
  }

  private createFailsafeAssessment(evidence: any): any {
    return {
      risk: {
        band: 'urgent' as const,
        pUrgent: 0.8,
        explain: [
          'Risk assessment system error - defaulting to urgent for patient safety',
          'Manual clinical review required'
        ],
        requiredInvestigations: ['Clinical evaluation', 'Vital signs assessment'],
        differentials: ['Unable to determine - requires clinical assessment']
      },
      confidence: 0.3,
      reasoning: [
        'System error encountered during risk assessment',
        'Defaulted to urgent priority for patient safety',
        'Manual clinical evaluation recommended'
      ]
    };
  }

  // Utility method for specialized risk assessments
  async assessChestPainRisk(evidence: any): Promise<{
    cardiacRisk: 'low' | 'intermediate' | 'high';
    recommendedWorkup: string[];
    timeFrame: string;
  }> {
    const chestPainRequest = `
Specialized cardiac risk assessment for chest pain:

EVIDENCE: ${JSON.stringify(evidence, null, 2)}

Provide cardiac-specific risk stratification and workup recommendations.
Consider HEART score, TIMI risk factors, and clinical presentation.

Return JSON with cardiacRisk, recommendedWorkup array, and timeFrame.
`;

    try {
      const response = await this.provider.chat([
        { role: 'system', content: 'You are a cardiology specialist providing evidence-based cardiac risk assessment.' },
        { role: 'user', content: chestPainRequest }
      ], { temperature: 0.1 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Chest pain risk assessment failed', { error: error.message });
    }

    // Fallback
    return {
      cardiacRisk: 'intermediate',
      recommendedWorkup: ['ECG', 'Troponin', 'Chest X-ray'],
      timeFrame: 'Immediate evaluation recommended'
    };
  }
}