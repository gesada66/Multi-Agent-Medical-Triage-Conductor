import { LlmProvider, ChatMessage } from '../../adapters/llm/types';
import { CachedPromptTemplates } from '../prompts/CachedPromptTemplates';
import { logger } from '../../logger';

export class CarePathwayPlannerAgent {
  private provider: LlmProvider;
  private systemPrompt: ChatMessage;

  constructor(provider: LlmProvider) {
    this.provider = provider;
    const cachedPrompt = CachedPromptTemplates.getCachedSystemPrompt('CarePathwayPlannerAgent');
    if (!cachedPrompt) {
      throw new Error('CarePathwayPlanner system prompt not found');
    }
    this.systemPrompt = cachedPrompt;
  }

  async createCarePlan(
    clinicalEvidence: any,
    riskAssessment: any,
    patientPreferences?: {
      preferredLanguage?: string;
      mobilityConstraints?: string[];
      insuranceType?: string;
    }
  ): Promise<{
    plan: {
      disposition: string;
      why: string[];
      whatToExpect: string[];
      safetyNet: string[];
      timeframe: string;
      followUp?: string;
    };
    citations: Array<{
      source: string;
      snippet: string;
      guideline: string;
    }>;
    confidence: number;
    alternatives?: string[];
  }> {
    try {
      logger.info('Creating care pathway plan', {
        patientId: clinicalEvidence.patientId,
        riskBand: riskAssessment.risk.band,
        pUrgent: riskAssessment.risk.pUrgent
      });

      const planningRequest = this.buildCarePathwayRequest(
        clinicalEvidence,
        riskAssessment,
        patientPreferences
      );

      // Use smart routing - complex medical care planning may use Sonnet
      const response = await this.provider.chat([
        this.systemPrompt,
        { role: 'user', content: planningRequest }
      ], {
        temperature: 0.1,
        maxTokens: 3000
      });

      const carePlan = await this.parseAndValidateCarePlan(response);

      // Apply clinical pathway validation
      const validatedPlan = this.validateClinicalPathway(
        carePlan,
        riskAssessment
      );

      logger.info('Care pathway plan created', {
        patientId: clinicalEvidence.patientId,
        disposition: validatedPlan.plan.disposition,
        timeframe: validatedPlan.plan.timeframe,
        confidence: validatedPlan.confidence
      });

      return validatedPlan;

    } catch (error) {
      logger.error('Care pathway planning failed', {
        patientId: clinicalEvidence.patientId,
        error: error.message
      });
      
      return this.createFailsafeCarePlan(riskAssessment);
    }
  }

  private buildCarePathwayRequest(
    evidence: any,
    risk: any,
    preferences?: any
  ): string {
    return `
CLINICAL EVIDENCE SUMMARY:
Patient: ${evidence.patientId}
Chief Complaint: ${evidence.presentingComplaint}
Red Flags: ${evidence.features?.redFlags?.join(', ') || 'None'}
Severity: ${evidence.features?.severity || 'Not specified'}/10

RISK ASSESSMENT:
Risk Band: ${risk.risk.band}
Urgency Probability: ${risk.risk.pUrgent}
Clinical Reasoning: ${risk.risk.explain?.join('; ') || 'Not specified'}
Required Investigations: ${risk.risk.requiredInvestigations?.join(', ') || 'None specified'}

${preferences ? `
PATIENT PREFERENCES:
Language: ${preferences.preferredLanguage || 'English'}
Mobility: ${preferences.mobilityConstraints?.join(', ') || 'No constraints'}
Insurance: ${preferences.insuranceType || 'Not specified'}
` : ''}

TASK: Create evidence-based care pathway plan using clinical guidelines.

CARE PATHWAY MAPPING:

IMMEDIATE RISK → Emergency Department:
- "Emergency Department immediately via ambulance"
- "Call 911 if not already in emergency setting"
- "Life-threatening condition requiring immediate intervention"
- Timeframe: "Immediate - within minutes"

URGENT RISK → Same-Day Care:
- "Emergency Department within 4 hours" (if high acuity)
- "Urgent care center today" (if moderate acuity)
- "Same-day GP appointment with safety netting"
- Timeframe: "Within 4 hours" or "Today"

ROUTINE RISK → Scheduled Care:
- "GP appointment within 48-72 hours"
- "Specialist referral if indicated"
- "Self-care with clear safety netting"
- "Pharmacy consultation for minor issues"
- Timeframe: "Within 2-3 days"

CLINICAL GUIDELINES TO REFERENCE:
1. NICE Guidelines for relevant conditions
2. Emergency Medicine protocols
3. Primary care pathways
4. Specialty-specific guidelines

SAFETY NETTING REQUIREMENTS:
- Always include "return immediately if symptoms worsen"
- Specify red flag symptoms to watch for
- Provide clear timeframes for follow-up
- Include emergency contact information
- Address patient concerns proactively

OUTPUT REQUIRED JSON:
{
  "plan": {
    "disposition": "Clear instruction on where to seek care",
    "why": [
      "Primary clinical reason",
      "Supporting evidence",
      "Risk mitigation rationale"
    ],
    "whatToExpect": [
      "What will happen during assessment",
      "Likely investigations or tests",
      "Potential treatment options"
    ],
    "safetyNet": [
      "Return immediately if: specific red flags",
      "Follow-up appointment timing",
      "When to call emergency services"
    ],
    "timeframe": "Specific timing guidance",
    "followUp": "Follow-up care instructions"
  },
  "citations": [
    {
      "source": "NICE CG95",
      "snippet": "Chest pain assessment in primary care",
      "guideline": "NICE Chest Pain Guidelines"
    }
  ],
  "confidence": 0.88,
  "alternatives": [
    "Alternative care option if primary not available"
  ]
}

CARE PATHWAY PRINCIPLES:
1. Patient safety is paramount
2. Use evidence-based guidelines
3. Provide clear, actionable instructions
4. Include comprehensive safety netting
5. Consider patient preferences and constraints
6. Ensure continuity of care
7. Address potential complications
8. Include cost-effective options where appropriate

CITATION REQUIREMENTS:
- Reference specific clinical guidelines
- Include evidence-based rationale
- Cite relevant protocols or pathways
- Provide snippet of supporting evidence

Generate clinically appropriate care pathway with proper medical reasoning.
`;
  }

  private async parseAndValidateCarePlan(response: string): Promise<any> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in care plan response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required structure
      if (!parsed.plan || !parsed.confidence) {
        throw new Error('Missing required care plan fields');
      }

      // Validate plan components
      if (!parsed.plan.disposition) {
        throw new Error('Care plan must include disposition');
      }

      // Ensure arrays exist
      parsed.plan.why = Array.isArray(parsed.plan.why) ? parsed.plan.why : ['Care recommendation provided'];
      parsed.plan.whatToExpected = Array.isArray(parsed.plan.whatToExpect) ? parsed.plan.whatToExpected : [];
      parsed.plan.safetyNet = Array.isArray(parsed.plan.safetyNet) ? parsed.plan.safetyNet : [];
      parsed.citations = Array.isArray(parsed.citations) ? parsed.citations : [];

      // Validate confidence
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        parsed.confidence = 0.7; // Default moderate confidence
      }

      return parsed;

    } catch (error) {
      logger.error('Failed to parse care plan response', { error: error.message });
      throw new Error('Invalid care plan response format');
    }
  }

  private validateClinicalPathway(carePlan: any, riskAssessment: any): any {
    const riskBand = riskAssessment.risk.band;
    const disposition = carePlan.plan.disposition.toLowerCase();

    // Clinical pathway consistency checks
    if (riskBand === 'immediate' && !disposition.includes('emergency')) {
      logger.warn('Immediate risk requires ED disposition - correcting', {
        originalDisposition: carePlan.plan.disposition,
        riskBand
      });
      
      carePlan.plan.disposition = 'Emergency Department immediately';
      carePlan.plan.timeframe = 'Immediate - call 911';
      carePlan.plan.why.unshift('Immediate risk requires emergency care');
    }

    if (riskBand === 'urgent' && disposition.includes('routine')) {
      logger.warn('Urgent risk requires timely care - correcting', {
        originalDisposition: carePlan.plan.disposition,
        riskBand
      });
      
      carePlan.plan.timeframe = 'Within 4 hours';
      if (!disposition.includes('urgent') && !disposition.includes('emergency')) {
        carePlan.plan.disposition = 'Urgent care or Emergency Department today';
      }
    }

    // Ensure safety netting is comprehensive
    carePlan.plan.safetyNet = this.enhanceSafetyNetting(
      carePlan.plan.safetyNet,
      riskAssessment
    );

    // Add mandatory safety information
    if (!carePlan.plan.safetyNet.some((item: string) => item.includes('911') || item.includes('emergency'))) {
      carePlan.plan.safetyNet.push('Call 911 immediately if you experience severe worsening of symptoms');
    }

    return carePlan;
  }

  private enhanceSafetyNetting(existingSafety: string[], riskAssessment: any): string[] {
    const enhanced = [...existingSafety];
    const riskBand = riskAssessment.risk.band;

    // Add risk-specific safety netting
    if (riskBand === 'immediate' && !enhanced.some(item => item.includes('911'))) {
      enhanced.unshift('If not already in ED, call 911 immediately');
    }

    if (riskBand === 'urgent' && !enhanced.some(item => item.includes('worsening'))) {
      enhanced.push('Return to ED immediately if symptoms significantly worsen');
    }

    // Add general safety netting if missing
    if (!enhanced.some(item => item.includes('follow-up'))) {
      enhanced.push('Follow up with your primary care provider as recommended');
    }

    return enhanced;
  }

  private createFailsafeCarePlan(riskAssessment: any): any {
    const riskBand = riskAssessment.risk.band || 'urgent';
    
    let disposition = 'Emergency Department for evaluation';
    let timeframe = 'Within 4 hours';
    
    if (riskBand === 'immediate') {
      disposition = 'Emergency Department immediately';
      timeframe = 'Immediate - call 911';
    } else if (riskBand === 'routine') {
      disposition = 'Primary care appointment';
      timeframe = 'Within 2-3 days';
    }

    return {
      plan: {
        disposition,
        why: [
          'Care planning system encountered an error',
          'Defaulting to safe care pathway',
          'Clinical evaluation recommended'
        ],
        whatToExpect: [
          'Medical assessment by healthcare professional',
          'Appropriate diagnostic workup',
          'Treatment plan based on clinical findings'
        ],
        safetyNet: [
          'Return immediately if symptoms worsen significantly',
          'Call 911 for severe worsening or emergency symptoms',
          'Follow up as clinically indicated'
        ],
        timeframe,
        followUp: 'As recommended by treating clinician'
      },
      citations: [
        {
          source: 'System Safety Protocol',
          snippet: 'Failsafe care pathway activated due to system error',
          guideline: 'Patient Safety Guidelines'
        }
      ],
      confidence: 0.4,
      alternatives: ['Seek immediate clinical evaluation if uncertain']
    };
  }

  // Specialized care planning methods
  async createEmergencyCarePlan(evidence: any, riskAssessment: any): Promise<any> {
    const emergencyRequest = `
EMERGENCY CARE PLANNING:
Evidence: ${JSON.stringify(evidence, null, 2)}
Risk: ${JSON.stringify(riskAssessment, null, 2)}

Create emergency-specific care plan with:
- Immediate actions required
- Emergency department preparation
- Critical information to communicate
- Family/caregiver instructions

Focus on life-saving interventions and clear communication.
`;

    try {
      const response = await this.provider.chat([
        { role: 'system', content: 'You are an emergency medicine specialist creating urgent care plans.' },
        { role: 'user', content: emergencyRequest }
      ], { temperature: 0.05 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Emergency care planning failed', { error: error.message });
    }

    return this.createFailsafeCarePlan(riskAssessment);
  }

  async estimateWaitTimes(disposition: string, location?: string): Promise<{
    estimatedWait: string;
    alternativeOptions: string[];
    busyPeriods: string[];
  }> {
    // Placeholder for real-time healthcare system integration
    // In production, this would query actual ED wait times, urgent care availability, etc.
    
    const dispositionLower = disposition.toLowerCase();
    
    if (dispositionLower.includes('emergency')) {
      return {
        estimatedWait: 'Triage immediate, treatment varies by severity',
        alternativeOptions: ['Call ahead if not life-threatening'],
        busyPeriods: ['Evenings', 'Weekends', 'Monday mornings']
      };
    }
    
    if (dispositionLower.includes('urgent')) {
      return {
        estimatedWait: '1-3 hours typical',
        alternativeOptions: ['Multiple urgent care locations', 'Telehealth consultation'],
        busyPeriods: ['After work hours', 'Weekends']
      };
    }

    return {
      estimatedWait: 'Same day or next available appointment',
      alternativeOptions: ['Telehealth', 'Walk-in clinics', 'Pharmacy consultation'],
      busyPeriods: ['Monday mornings', 'Post-holiday periods']
    };
  }
}