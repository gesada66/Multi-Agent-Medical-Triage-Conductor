import { LlmProvider, ChatMessage } from '../../adapters/llm/types';
import { VectorStore, EmbeddingService, SearchResult, MedicalKnowledge } from '../../adapters/vector/types';
import { ClinicalEvidence, RiskAssessment } from '../../schemas';
import { logger } from '../../logger';

export class MemoryAugmentedRiskAgent {
  private provider: LlmProvider;
  private vectorStore: VectorStore;
  private embeddingService: EmbeddingService;

  constructor(
    provider: LlmProvider, 
    vectorStore: VectorStore, 
    embeddingService: EmbeddingService
  ) {
    this.provider = provider;
    this.vectorStore = vectorStore;
    this.embeddingService = embeddingService;
  }

  async assessRiskWithMemory(
    evidence: ClinicalEvidence,
    patientId: string
  ): Promise<RiskAssessment> {
    try {
      // 1. Generate embedding for current case
      const symptomText = `${evidence.primarySymptom} ${evidence.associatedSymptoms?.join(' ')} ${evidence.onset}`;
      const embedding = await this.embeddingService.embedText(symptomText);

      // 2. Retrieve similar historical cases
      const similarCases = await this.vectorStore.findSimilarCases(
        embedding,
        {
          ageRange: this.getAgeRange(evidence.patientContext?.age),
          gender: evidence.patientContext?.gender
        },
        5
      );

      // 3. Retrieve relevant medical knowledge
      const clinicalDomain = this.inferClinicalDomain(evidence.primarySymptom);
      const medicalKnowledge = await this.vectorStore.searchMedicalKnowledge(
        embedding,
        clinicalDomain,
        3
      );

      // 4. Enhanced risk assessment with memory context
      const memoryContext = this.buildMemoryContext(similarCases, medicalKnowledge);
      const riskAssessment = await this.performMemoryAugmentedRiskAssessment(
        evidence,
        memoryContext
      );

      logger.info('Memory-augmented risk assessment completed', {
        patientId,
        riskBand: riskAssessment.riskBand,
        similarCasesFound: similarCases.length,
        knowledgeRetrieved: medicalKnowledge.length
      });

      return riskAssessment;
    } catch (error) {
      logger.error('Memory-augmented risk assessment failed', { 
        patientId, 
        error: error.message 
      });
      
      // Fallback to standard risk assessment
      return this.standardRiskAssessment(evidence);
    }
  }

  private async performMemoryAugmentedRiskAssessment(
    evidence: ClinicalEvidence,
    memoryContext: string
  ): Promise<RiskAssessment> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert medical risk stratification agent with access to historical case data and updated medical knowledge.

MEMORY AUGMENTED CONTEXT:
${memoryContext}

Use this historical context to inform your risk assessment, but always prioritize current clinical guidelines and the specific patient presentation.

RISK STRATIFICATION GUIDELINES:
- IMMEDIATE: Life-threatening conditions requiring emergency intervention
- URGENT: Conditions requiring assessment within 4 hours
- ROUTINE: Conditions suitable for primary care follow-up

Consider:
1. How similar historical cases were triaged and their outcomes
2. Any patterns of under-triage or over-triage in similar presentations
3. Updated medical evidence and guidelines
4. Population-specific risk factors from historical data

Provide structured JSON output with risk band, probability, reasoning, and confidence.`
      },
      {
        role: 'user',
        content: `Assess the medical risk for this patient presentation:

PRIMARY SYMPTOM: ${evidence.primarySymptom}
ASSOCIATED SYMPTOMS: ${evidence.associatedSymptoms?.join(', ') || 'None'}
ONSET: ${evidence.onset}
SEVERITY: ${evidence.severity}
RED FLAGS: ${evidence.redFlags?.join(', ') || 'None'}
PATIENT AGE: ${evidence.patientContext?.age || 'Unknown'}
COMORBIDITIES: ${evidence.patientContext?.existingConditions?.join(', ') || 'None'}

Based on the historical context and current presentation, what is the appropriate risk stratification?`
      }
    ];

    const response = await this.provider.chat(messages, {
      temperature: 0.1,
      model: 'claude-3-5-sonnet-20241022' // Use Sonnet for complex medical reasoning
    });

    try {
      const assessment = JSON.parse(response);
      return {
        riskBand: assessment.riskBand,
        pUrgent: assessment.pUrgent || 0.5,
        redFlags: assessment.redFlags || [],
        explain: assessment.reasoning || [],
        confidence: assessment.confidence || 0.7,
        memoryAugmented: true,
        similarCasesConsidered: true
      };
    } catch (parseError) {
      logger.error('Failed to parse memory-augmented risk assessment', { parseError });
      return this.standardRiskAssessment(evidence);
    }
  }

  private buildMemoryContext(
    similarCases: SearchResult[],
    medicalKnowledge: MedicalKnowledge[]
  ): string {
    let context = '';

    if (similarCases.length > 0) {
      context += 'HISTORICAL SIMILAR CASES:\n';
      similarCases.forEach((case_, index) => {
        context += `${index + 1}. Symptoms: "${case_.symptoms}"\n`;
        context += `   Initial Triage: ${case_.initialTriage}\n`;
        context += `   Actual Outcome: ${case_.actualOutcome}\n`;
        context += `   Similarity: ${(case_.similarity * 100).toFixed(1)}%\n`;
        if (case_.lessonsLearned?.length) {
          context += `   Lessons: ${case_.lessonsLearned.join('; ')}\n`;
        }
        context += '\n';
      });
    }

    if (medicalKnowledge.length > 0) {
      context += 'RELEVANT MEDICAL KNOWLEDGE:\n';
      medicalKnowledge.forEach((knowledge, index) => {
        context += `${index + 1}. ${knowledge.content}\n`;
        context += `   Source: ${knowledge.source} (Evidence Level: ${knowledge.evidenceLevel})\n`;
        context += `   Domain: ${knowledge.clinicalDomain}\n\n`;
      });
    }

    return context || 'No relevant historical data available.';
  }

  private getAgeRange(age?: number): string {
    if (!age) return 'unknown';
    if (age < 18) return 'pediatric';
    if (age < 65) return 'adult';
    return 'elderly';
  }

  private inferClinicalDomain(primarySymptom: string): string {
    const symptom = primarySymptom.toLowerCase();
    if (symptom.includes('chest') || symptom.includes('cardiac') || symptom.includes('heart')) {
      return 'cardiology';
    }
    if (symptom.includes('head') || symptom.includes('neuro') || symptom.includes('seizure')) {
      return 'neurology';
    }
    if (symptom.includes('trauma') || symptom.includes('accident') || symptom.includes('injury')) {
      return 'emergency';
    }
    return 'general';
  }

  private async standardRiskAssessment(evidence: ClinicalEvidence): Promise<RiskAssessment> {
    // Fallback to standard non-memory assessment
    return {
      riskBand: 'urgent',
      pUrgent: 0.5,
      redFlags: evidence.redFlags || [],
      explain: ['Standard risk assessment applied - memory augmentation unavailable'],
      confidence: 0.6,
      memoryAugmented: false,
      similarCasesConsidered: false
    };
  }

  // Method to store case outcomes for learning
  async storeCaseOutcome(
    caseId: string,
    evidence: ClinicalEvidence,
    initialTriage: string,
    actualOutcome: 'correct' | 'under_triaged' | 'over_triaged',
    followUpNotes?: string
  ): Promise<void> {
    try {
      const symptomText = `${evidence.primarySymptom} ${evidence.associatedSymptoms?.join(' ')} ${evidence.onset}`;
      const embedding = await this.embeddingService.embedText(symptomText);

      await this.vectorStore.storeCaseOutcome({
        caseId,
        symptoms: symptomText,
        symptomEmbedding: embedding,
        initialTriage: initialTriage as any,
        actualOutcome,
        demographics: {
          age: evidence.patientContext?.age || 0,
          gender: evidence.patientContext?.gender || 'unknown',
          comorbidities: evidence.patientContext?.existingConditions || []
        },
        timestamp: new Date().toISOString(),
        followUpNotes
      });

      logger.info('Stored case outcome for future learning', { caseId, actualOutcome });
    } catch (error) {
      logger.error('Failed to store case outcome', { caseId, error: error.message });
    }
  }
}