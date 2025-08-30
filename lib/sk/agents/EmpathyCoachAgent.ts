import { LlmProvider, ChatMessage } from '../../adapters/llm/types';
import { CachedPromptTemplates } from '../prompts/CachedPromptTemplates';
import { logger } from '../../logger';

export class EmpathyCoachAgent {
  private provider: LlmProvider;
  private systemPrompt: ChatMessage;

  constructor(provider: LlmProvider) {
    this.provider = provider;
    const cachedPrompt = CachedPromptTemplates.getCachedSystemPrompt('EmpathyCoachAgent');
    if (!cachedPrompt) {
      throw new Error('EmpathyCoach system prompt not found');
    }
    this.systemPrompt = cachedPrompt;
  }

  async adaptResponse(
    carePlan: any,
    mode: 'patient' | 'clinician',
    patientContext?: {
      age?: number;
      anxietyLevel?: 'low' | 'medium' | 'high';
      healthLiteracy?: 'basic' | 'intermediate' | 'advanced';
      culturalConsiderations?: string[];
      preferredLanguage?: string;
    }
  ): Promise<{
    adaptedResponse: {
      disposition: string;
      explanation: string[];
      whatToExpect: string[];
      safetyNet: string[];
      reassurance?: string[];
      nextSteps: string[];
    };
    tone: 'urgent' | 'calm' | 'reassuring';
    confidence: number;
  }> {
    try {
      logger.info('Adapting response for audience', {
        mode,
        originalDisposition: carePlan.plan.disposition,
        hasPatientContext: !!patientContext
      });

      const adaptationRequest = this.buildAdaptationRequest(
        carePlan,
        mode,
        patientContext
      );

      // Use Haiku for language adaptation - it's excellent at this task
      const response = await this.provider.chat([
        this.systemPrompt,
        { role: 'user', content: adaptationRequest }
      ], {
        temperature: 0.3, // Slightly higher for natural language variation
        maxTokens: 2000
      });

      const adaptedResponse = await this.parseAndValidateAdaptation(response, mode);

      logger.info('Response adaptation completed', {
        mode,
        tone: adaptedResponse.tone,
        confidence: adaptedResponse.confidence
      });

      return adaptedResponse;

    } catch (error) {
      logger.error('Response adaptation failed', {
        mode,
        error: error.message
      });
      
      return this.createFailsafeAdaptation(carePlan, mode);
    }
  }

  private buildAdaptationRequest(
    carePlan: any,
    mode: 'patient' | 'clinician',
    context?: any
  ): string {
    return `
ORIGINAL CARE PLAN:
Disposition: ${carePlan.plan.disposition}
Clinical Reasoning: ${carePlan.plan.why?.join('; ') || 'Not specified'}
What to Expect: ${carePlan.plan.whatToExpect?.join('; ') || 'Not specified'}
Safety Netting: ${carePlan.plan.safetyNet?.join('; ') || 'Not specified'}
Timeframe: ${carePlan.plan.timeframe || 'Not specified'}

TARGET AUDIENCE: ${mode.toUpperCase()}

${context ? `
PATIENT CONTEXT:
- Age: ${context.age || 'Not specified'}
- Anxiety Level: ${context.anxietyLevel || 'Not specified'}
- Health Literacy: ${context.healthLiteracy || 'Not specified'}
- Cultural Considerations: ${context.culturalConsiderations?.join(', ') || 'None specified'}
- Preferred Language: ${context.preferredLanguage || 'English'}
` : ''}

ADAPTATION REQUIREMENTS:

FOR PATIENT MODE:
- Use simple, non-medical language
- Avoid technical terms and abbreviations
- Explain medical terms when necessary (e.g., "chest X-ray (picture of your chest)")
- Focus on reassurance and clear next steps
- Omit differential diagnoses and clinical reasoning details
- Include emotional support and validation
- Emphasize what the patient should do and expect
- Use encouraging, supportive tone
- Address common fears and concerns

FOR CLINICIAN MODE:
- Use appropriate medical terminology
- Include differential diagnoses considerations
- Provide clinical reasoning and evidence basis
- Reference specific guidelines and protocols
- Include investigation recommendations with rationale
- Focus on clinical decision-making support
- Use professional, concise language
- Include relevant clinical pearls or considerations

TONE GUIDELINES:
- URGENT: Direct, clear, emphasizes immediate action needed
- CALM: Balanced, informative, reduces anxiety while being clear
- REASSURING: Supportive, emphasizes positive aspects while being honest

LANGUAGE ADAPTATIONS:

Patient-Friendly Translations:
- "Emergency Department" → "emergency room" or "hospital emergency department"
- "Urgent care" → "urgent care clinic (walk-in medical clinic)"
- "Primary care" → "your regular doctor" or "family doctor"
- "Myocardial infarction" → "heart attack"
- "Syncope" → "fainting" or "passing out"
- "Dyspnea" → "difficulty breathing" or "shortness of breath"

Cultural Sensitivity:
- Consider health beliefs and practices
- Respect family decision-making structures
- Address potential stigma concerns
- Use culturally appropriate communication styles

OUTPUT REQUIRED JSON:
{
  "adaptedResponse": {
    "disposition": "Where you need to go for care (patient-friendly language)",
    "explanation": [
      "Why this care is recommended",
      "What this means for you"
    ],
    "whatToExpect": [
      "What will happen when you get there",
      "What tests or treatments you might need"
    ],
    "safetyNet": [
      "When to get help sooner",
      "Warning signs to watch for"
    ],
    "reassurance": [
      "Positive or encouraging statements (patient mode only)"
    ],
    "nextSteps": [
      "Clear action items",
      "What to do right now"
    ]
  },
  "tone": "urgent|calm|reassuring",
  "confidence": 0.85
}

EMPATHY AND COMMUNICATION PRINCIPLES:
1. Acknowledge the person's concerns and feelings
2. Use clear, jargon-free communication
3. Provide specific, actionable guidance
4. Validate emotions while providing medical direction
5. Emphasize partnership in care
6. Address unspoken concerns proactively
7. Balance honesty with hope
8. Respect individual preferences and values

SAFETY CONSIDERATIONS:
- Never minimize serious symptoms
- Always include appropriate safety netting
- Ensure clear understanding of urgency level
- Provide emergency contact information when relevant
- Emphasize when immediate action is needed

Generate compassionate, audience-appropriate medical communication.
`;
  }

  private async parseAndValidateAdaptation(response: string, mode: string): Promise<any> {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in adaptation response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required structure
      if (!parsed.adaptedResponse || !parsed.tone) {
        throw new Error('Missing required adaptation fields');
      }

      // Ensure arrays exist
      parsed.adaptedResponse.explanation = Array.isArray(parsed.adaptedResponse.explanation) 
        ? parsed.adaptedResponse.explanation : ['Care recommendation provided'];
      parsed.adaptedResponse.whatToExpect = Array.isArray(parsed.adaptedResponse.whatToExpect) 
        ? parsed.adaptedResponse.whatToExpect : [];
      parsed.adaptedResponse.safetyNet = Array.isArray(parsed.adaptedResponse.safetyNet) 
        ? parsed.adaptedResponse.safetyNet : [];
      parsed.adaptedResponse.nextSteps = Array.isArray(parsed.adaptedResponse.nextSteps) 
        ? parsed.adaptedResponse.nextSteps : ['Follow the care recommendations provided'];

      // Patient mode should have reassurance
      if (mode === 'patient' && !parsed.adaptedResponse.reassurance) {
        parsed.adaptedResponse.reassurance = ['We are here to help you get the right care'];
      }

      // Clinician mode should not have reassurance section
      if (mode === 'clinician') {
        delete parsed.adaptedResponse.reassurance;
      }

      // Validate tone
      const validTones = ['urgent', 'calm', 'reassuring'];
      if (!validTones.includes(parsed.tone)) {
        parsed.tone = 'calm';
      }

      // Validate confidence
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        parsed.confidence = 0.8;
      }

      return parsed;

    } catch (error) {
      logger.error('Failed to parse adaptation response', { error: error.message });
      throw new Error('Invalid adaptation response format');
    }
  }

  private createFailsafeAdaptation(carePlan: any, mode: string): any {
    const isPatient = mode === 'patient';
    
    const failsafe = {
      adaptedResponse: {
        disposition: isPatient 
          ? 'Please seek medical care as recommended'
          : carePlan.plan.disposition || 'Clinical evaluation recommended',
        explanation: isPatient
          ? ['Based on your symptoms, medical care is recommended', 'This will help ensure you get the right treatment']
          : ['System adaptation error occurred', 'Original care plan should be followed'],
        whatToExpect: isPatient
          ? ['A healthcare professional will evaluate your condition', 'You may need some tests or examinations']
          : ['Standard medical assessment and workup', 'Clinical judgment required'],
        safetyNet: isPatient
          ? ['Get help right away if your symptoms get much worse', 'Call 911 if you have an emergency']
          : ['Standard safety netting applies', 'Emergency services for urgent deterioration'],
        nextSteps: [
          isPatient ? 'Follow the care recommendations provided' : 'Implement care plan as specified'
        ]
      },
      tone: 'calm' as const,
      confidence: 0.5
    };

    if (isPatient) {
      failsafe.adaptedResponse.reassurance = [
        'Getting medical care is the right step to take',
        'Healthcare professionals are trained to help with these situations'
      ];
    }

    return failsafe;
  }

  // Utility methods for specialized adaptations
  async adaptForAnxiousPatient(carePlan: any): Promise<any> {
    const anxietyRequest = `
Adapt this care plan for a patient with high anxiety:
${JSON.stringify(carePlan, null, 2)}

Focus on:
- Extra reassurance and support
- Clear explanations to reduce uncertainty
- Addressing common fears
- Emphasizing positive aspects
- Providing coping strategies

Return adapted response with calming, supportive tone.
`;

    try {
      const response = await this.provider.chat([
        { role: 'system', content: 'You are a compassionate healthcare communicator specializing in anxiety-sensitive patient care.' },
        { role: 'user', content: anxietyRequest }
      ], { temperature: 0.4 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Anxiety adaptation failed', { error: error.message });
    }

    return this.createFailsafeAdaptation(carePlan, 'patient');
  }

  async adaptForCulturalContext(
    carePlan: any, 
    culturalFactors: string[]
  ): Promise<any> {
    const culturalRequest = `
Adapt this care plan considering cultural factors: ${culturalFactors.join(', ')}
Care Plan: ${JSON.stringify(carePlan, null, 2)}

Consider:
- Cultural health beliefs and practices
- Family involvement in healthcare decisions
- Religious or spiritual considerations
- Communication preferences
- Potential stigma concerns

Provide culturally sensitive adaptation.
`;

    try {
      const response = await this.provider.chat([
        { role: 'system', content: 'You are a culturally competent healthcare communicator with expertise in cross-cultural patient care.' },
        { role: 'user', content: culturalRequest }
      ], { temperature: 0.3 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Cultural adaptation failed', { error: error.message });
    }

    return this.createFailsafeAdaptation(carePlan, 'patient');
  }

  async translateToLanguage(
    adaptedResponse: any, 
    targetLanguage: string
  ): Promise<any> {
    if (targetLanguage.toLowerCase() === 'english') {
      return adaptedResponse;
    }

    const translationRequest = `
Translate this medical care response to ${targetLanguage}:
${JSON.stringify(adaptedResponse, null, 2)}

Requirements:
- Maintain medical accuracy
- Use culturally appropriate expressions
- Keep the same level of formality
- Ensure clarity and comprehension
- Preserve all safety information

Return the same JSON structure with translated content.
`;

    try {
      const response = await this.provider.chat([
        { role: 'system', content: `You are a medical translator specializing in ${targetLanguage} healthcare communication.` },
        { role: 'user', content: translationRequest }
      ], { temperature: 0.2 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.error('Translation failed', { error: error.message, targetLanguage });
    }

    return adaptedResponse; // Return original if translation fails
  }
}