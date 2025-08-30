import { LlmProvider, ChatMessage } from '@/lib/adapters/llm/types';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';

interface MedicalTestDataSuite {
  patientProfiles: PatientProfile[];
  clinicalScenarios: ClinicalScenario[];
  symptomVariations: SymptomVariation[];
  riskAssessmentCases: RiskAssessmentCase[];
  carePathwayCases: CarePathwayCase[];
  edgeCases: EdgeCase[];
}

interface PatientProfile {
  id: string;
  demographics: {
    age: number;
    gender: 'male' | 'female' | 'other';
    ethnicity: string;
    primaryLanguage: string;
  };
  medicalHistory: {
    conditions: string[];
    medications: string[];
    allergies: string[];
    surgeries: string[];
  };
  riskFactors: string[];
  insuranceStatus: string;
  preferredCommunication: 'patient' | 'clinician';
}

interface ClinicalScenario {
  id: string;
  name: string;
  category: 'emergency' | 'urgent' | 'routine' | 'preventive';
  chiefComplaint: string;
  presentingSymptoms: string[];
  duration: string;
  severity: number; // 1-10 scale
  associatedSymptoms: string[];
  redFlags: string[];
  expectedDisposition: 'ED' | 'Urgent Care' | 'Primary Care' | 'Self Care' | 'Mental Health';
  expectedRiskLevel: 'immediate' | 'urgent' | 'routine' | 'low';
  snomedCodes: string[];
  icd10Codes: string[];
}

interface SymptomVariation {
  baseSymptom: string;
  variations: {
    mild: string[];
    moderate: string[];
    severe: string[];
  };
  synonyms: string[];
  commonMisspellings: string[];
  culturalVariations: { language: string; term: string; description: string; }[];
  ageSpecific: {
    pediatric: string[];
    adult: string[];
    geriatric: string[];
  };
}

interface RiskAssessmentCase {
  id: string;
  scenario: string;
  patientData: any;
  expectedRiskScore: number;
  expectedRiskLevel: string;
  riskFactors: string[];
  redFlagsPresent: string[];
  newsScore?: number;
  confidenceThreshold: number;
  reasoning: string;
}

interface CarePathwayCase {
  id: string;
  riskAssessment: any;
  expectedDisposition: string;
  urgencyLevel: string;
  safetyNetting: string[];
  followUpInstructions: string;
  escalationTriggers: string[];
  costConsiderations: string;
}

interface EdgeCase {
  id: string;
  type: 'ambiguous' | 'conflicting' | 'incomplete' | 'unusual' | 'technical';
  description: string;
  input: string;
  expectedBehavior: string;
  challengeArea: string;
}

export class MedicalTestDataGenerator {
  private provider: LlmProvider;
  
  constructor(provider: LlmProvider) {
    this.provider = provider;
  }

  async generateComprehensiveTestData(): Promise<{
    filesGenerated: string[];
    dataPointsCreated: number;
  }> {
    const startTime = Date.now();
    
    try {
      logger.info('Generating comprehensive medical test data');

      // Generate all types of medical test data
      const testDataSuite = await this.generateMedicalTestDataSuite();
      
      // Write data files
      const filesGenerated = await this.writeTestDataFiles(testDataSuite);
      
      // Calculate total data points
      const dataPointsCreated = this.calculateDataPoints(testDataSuite);
      
      logger.info('Medical test data generation completed', {
        filesGenerated: filesGenerated.length,
        dataPointsCreated,
        executionTime: Date.now() - startTime
      });

      return {
        filesGenerated,
        dataPointsCreated
      };

    } catch (error) {
      logger.error('Medical test data generation failed', { error: error.message });
      throw error;
    }
  }

  private async generateMedicalTestDataSuite(): Promise<MedicalTestDataSuite> {
    const suite: MedicalTestDataSuite = {
      patientProfiles: [],
      clinicalScenarios: [],
      symptomVariations: [],
      riskAssessmentCases: [],
      carePathwayCases: [],
      edgeCases: []
    };

    // Generate diverse patient profiles
    suite.patientProfiles = await this.generatePatientProfiles();
    
    // Generate clinical scenarios across all urgency levels
    suite.clinicalScenarios = await this.generateClinicalScenarios();
    
    // Generate symptom variations and synonyms
    suite.symptomVariations = await this.generateSymptomVariations();
    
    // Generate risk assessment test cases
    suite.riskAssessmentCases = await this.generateRiskAssessmentCases();
    
    // Generate care pathway test cases
    suite.carePathwayCases = await this.generateCarePathwayCases();
    
    // Generate edge cases and challenging scenarios
    suite.edgeCases = await this.generateEdgeCases();

    return suite;
  }

  private async generatePatientProfiles(): Promise<PatientProfile[]> {
    const profilePrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate diverse, realistic patient profiles for medical triage system testing.

PATIENT PROFILE REQUIREMENTS:
- Age diversity: pediatric (0-17), adult (18-64), geriatric (65+)
- Gender diversity: male, female, other/non-binary
- Ethnic diversity: various backgrounds and cultural considerations
- Medical complexity: healthy, single conditions, multiple comorbidities
- Social determinants: insurance status, language barriers, health literacy

MEDICAL HISTORY CONSIDERATIONS:
- Common chronic conditions (diabetes, hypertension, COPD, etc.)
- Relevant medications and drug interactions
- Allergies and adverse reactions
- Previous surgeries and procedures
- Mental health conditions

RISK FACTOR CATEGORIES:
- Cardiovascular: smoking, family history, obesity
- Respiratory: asthma, COPD, smoking
- Metabolic: diabetes, thyroid disorders
- Psychiatric: depression, anxiety, substance abuse
- Social: limited support, transportation issues

Generate 20 diverse patient profiles as JSON array. Use realistic but synthetic data only.`
      },
      {
        role: 'user',
        content: `Generate comprehensive patient profiles for medical triage testing.

Requirements:
- 20 diverse profiles covering all demographics
- Realistic medical histories
- Varied complexity levels
- Cultural and linguistic diversity
- HIPAA-compliant synthetic data only

Return as JSON array of PatientProfile objects.`
      }
    ];

    const response = await this.provider.chat(profilePrompt, { temperature: 0.4 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse patient profiles, using fallback', { error: error.message });
      return this.generateFallbackPatientProfiles();
    }
  }

  private async generateClinicalScenarios(): Promise<ClinicalScenario[]> {
    const scenarioPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate comprehensive clinical scenarios for medical triage system testing.

CLINICAL SCENARIO CATEGORIES:
1. EMERGENCY (Immediate): Life-threatening conditions requiring immediate intervention
   - Acute coronary syndrome, stroke, severe respiratory distress
   - Anaphylaxis, major trauma, altered mental status with red flags

2. URGENT (Same-day): Concerning symptoms requiring prompt evaluation
   - Chest pain without immediate red flags, moderate respiratory distress
   - Severe pain, suspected fractures, mental health crises

3. ROUTINE (48-72hrs): Common conditions requiring medical attention
   - Upper respiratory infections, minor injuries, chronic disease management
   - Skin conditions, minor gastrointestinal issues

4. PREVENTIVE/LOW: Health maintenance and minor concerns
   - Medication refills, health screening questions, minor skin issues

SCENARIO REQUIREMENTS:
- Realistic symptom presentations with proper medical terminology
- Include SNOMED-CT and ICD-10 codes where applicable
- Age-appropriate presentations (pediatric vs adult vs geriatric)
- Cultural and linguistic variations in symptom description
- Clear expected dispositions and risk levels

Generate 50 diverse clinical scenarios covering all categories. Use medical best practices for expected dispositions.`
      },
      {
        role: 'user',
        content: `Generate comprehensive clinical scenarios for medical triage testing.

Requirements:
- 50 scenarios across all urgency levels
- Realistic symptom presentations
- Proper medical coding (SNOMED-CT, ICD-10)
- Age-appropriate variations
- Clear expected outcomes

Return as JSON array of ClinicalScenario objects.`
      }
    ];

    const response = await this.provider.chat(scenarioPrompt, { temperature: 0.3 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse clinical scenarios, using fallback', { error: error.message });
      return this.generateFallbackClinicalScenarios();
    }
  }

  private async generateSymptomVariations(): Promise<SymptomVariation[]> {
    const variationPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate symptom variations and linguistic diversity for medical triage testing.

SYMPTOM VARIATION REQUIREMENTS:
- Common medical symptoms with severity variations
- Regional and cultural terminology differences
- Age-appropriate language (pediatric, adult, geriatric)
- Common misspellings and colloquialisms
- Synonyms and alternative descriptions

KEY SYMPTOMS TO COVER:
- Chest pain: crushing, burning, pressure, tightness, aching
- Headache: throbbing, stabbing, pressure, migraine-like
- Shortness of breath: breathlessness, wheezing, can't catch breath
- Abdominal pain: belly ache, stomach pain, cramping, sharp
- Dizziness: lightheaded, vertigo, unsteady, spinning

CULTURAL CONSIDERATIONS:
- Spanish: dolor de pecho, falta de aire, mareos
- Cultural descriptors: "heavy feeling", "elephant on chest"
- Age-specific: "tummy ache" vs "abdominal pain"
- Colloquial: "can't breathe good" vs "dyspnea"

SEVERITY DESCRIPTORS:
- Mild: slight, minor, little bit, comes and goes
- Moderate: noticeable, uncomfortable, interfering with activities
- Severe: excruciating, unbearable, worst ever, can't function

Generate 25 common symptoms with comprehensive variations.`
      },
      {
        role: 'user',
        content: `Generate symptom variations for diverse patient populations.

Requirements:
- 25 common medical symptoms
- Severity variations (mild, moderate, severe)
- Cultural and linguistic alternatives
- Age-appropriate terminology
- Common misspellings and synonyms

Return as JSON array of SymptomVariation objects.`
      }
    ];

    const response = await this.provider.chat(variationPrompt, { temperature: 0.4 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse symptom variations, using fallback', { error: error.message });
      return this.generateFallbackSymptomVariations();
    }
  }

  private async generateRiskAssessmentCases(): Promise<RiskAssessmentCase[]> {
    const riskPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate risk assessment test cases for medical triage validation.

RISK ASSESSMENT FRAMEWORK:
- Risk scores: 0-100 scale with clinical thresholds
- Risk levels: immediate (90-100), urgent (70-89), routine (30-69), low (0-29)
- NEWS score integration where vital signs available
- Red flag detection with deterministic rules
- Confidence scoring for decision quality

RISK FACTORS TO TEST:
1. Deterministic Red Flags (immediate):
   - Chest pain + diaphoresis/radiation/nausea
   - Severe headache + neurological symptoms
   - Difficulty breathing + altered consciousness

2. High-Risk Features (urgent):
   - Chest pain with cardiac risk factors
   - Severe pain >7/10
   - Moderate breathing difficulty
   - Significant vital sign abnormalities

3. Moderate Risk (routine):
   - Mild-moderate symptoms
   - Stable vitals
   - Chronic conditions without acute changes

4. Low Risk:
   - Minor symptoms
   - Normal vitals
   - Reassurance-seeking behavior

VALIDATION REQUIREMENTS:
- Clear reasoning for each risk assignment
- Confidence thresholds met (>0.9 for immediate, >0.7 for urgent)
- Proper red flag identification
- Age and comorbidity considerations

Generate 30 risk assessment cases with expected outcomes and reasoning.`
      },
      {
        role: 'user',
        content: `Generate risk assessment test cases for validation.

Requirements:
- 30 diverse risk assessment scenarios
- All risk levels represented
- Clear expected outcomes
- Confidence thresholds defined
- Medical reasoning provided

Return as JSON array of RiskAssessmentCase objects.`
      }
    ];

    const response = await this.provider.chat(riskPrompt, { temperature: 0.2 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse risk assessment cases, using fallback', { error: error.message });
      return this.generateFallbackRiskAssessmentCases();
    }
  }

  private async generateCarePathwayCases(): Promise<CarePathwayCase[]> {
    const pathwayPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate care pathway test cases for medical disposition validation.

CARE PATHWAY MAPPING:
1. Emergency Department (Immediate):
   - Life-threatening conditions
   - Red flag symptoms present
   - "Call 911 if not already in hospital"
   - No delays acceptable

2. Urgent Care (Same-day):
   - High-risk features without red flags
   - "Seek care within 4 hours"
   - "Hospital if unavailable"
   - Same-day GP if possible

3. Primary Care (48-72 hours):
   - Routine medical concerns
   - "GP appointment within 2-3 days"
   - "Self-care with safety netting"
   - Pharmacy consultation if minor

4. Self Care (Low risk):
   - Minor symptoms
   - "Monitor symptoms"
   - "Return if worsens"
   - "Pharmacy advice available"

SAFETY NETTING REQUIREMENTS:
- Always include "return if symptoms worsen"
- Specify red flag symptoms to watch
- Provide timeframe for review
- Include emergency contact instructions
- Consider patient education needs

FOLLOW-UP CONSIDERATIONS:
- Expected investigation pathways
- Treatment options likely
- Patient concerns addressed
- Cost-effective care routing
- Cultural sensitivity

Generate 25 care pathway cases with comprehensive guidance.`
      },
      {
        role: 'user',
        content: `Generate care pathway test cases for disposition validation.

Requirements:
- 25 diverse care pathway scenarios
- All disposition types covered
- Comprehensive safety netting
- Follow-up instructions
- Patient education components

Return as JSON array of CarePathwayCase objects.`
      }
    ];

    const response = await this.provider.chat(pathwayPrompt, { temperature: 0.3 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse care pathway cases, using fallback', { error: error.message });
      return this.generateFallbackCarePathwayCases();
    }
  }

  private async generateEdgeCases(): Promise<EdgeCase[]> {
    const edgeCasePrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Generate challenging edge cases for medical triage system testing.

EDGE CASE CATEGORIES:

1. AMBIGUOUS PRESENTATIONS:
   - Vague symptoms: "not feeling well", "something's wrong"
   - Multiple possible diagnoses
   - Conflicting symptom patterns
   - Symptom overlap between conditions

2. CONFLICTING INFORMATION:
   - Patient reports vs objective findings
   - Multiple complaints with different urgencies
   - Contradictory symptom descriptions
   - Inconsistent timelines

3. INCOMPLETE INFORMATION:
   - Missing critical details
   - Patient unable to describe symptoms clearly
   - Language barriers affecting description
   - Cognitive impairment affecting history

4. UNUSUAL PRESENTATIONS:
   - Atypical symptom patterns
   - Rare condition presentations
   - Age-atypical presentations
   - Drug-seeking behavior patterns

5. TECHNICAL CHALLENGES:
   - Very long symptom descriptions
   - Medical jargon mixed with lay terms
   - Emotional language affecting parsing
   - Multiple symptoms in single sentence

EXPECTED BEHAVIORS:
- Request clarification for ambiguous cases
- Handle conflicting information gracefully
- Acknowledge limitations with incomplete data
- Maintain safety bias for unusual presentations
- Process technical challenges appropriately

Generate 20 challenging edge cases that test system robustness.`
      },
      {
        role: 'user',
        content: `Generate edge cases for medical triage system testing.

Requirements:
- 20 challenging edge cases
- All categories represented
- Realistic but difficult scenarios
- Clear expected behaviors
- System robustness testing

Return as JSON array of EdgeCase objects.`
      }
    ];

    const response = await this.provider.chat(edgeCasePrompt, { temperature: 0.4 });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse edge cases, using fallback', { error: error.message });
      return this.generateFallbackEdgeCases();
    }
  }

  private async writeTestDataFiles(testDataSuite: MedicalTestDataSuite): Promise<string[]> {
    const filesGenerated: string[] = [];
    const dataDir = 'data/test';
    
    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Write patient profiles
    const patientProfilesPath = join(dataDir, 'patient-profiles.json');
    writeFileSync(patientProfilesPath, JSON.stringify(testDataSuite.patientProfiles, null, 2), 'utf-8');
    filesGenerated.push(patientProfilesPath);

    // Write clinical scenarios
    const clinicalScenariosPath = join(dataDir, 'clinical-scenarios.json');
    writeFileSync(clinicalScenariosPath, JSON.stringify(testDataSuite.clinicalScenarios, null, 2), 'utf-8');
    filesGenerated.push(clinicalScenariosPath);

    // Write symptom variations
    const symptomVariationsPath = join(dataDir, 'symptom-variations.json');
    writeFileSync(symptomVariationsPath, JSON.stringify(testDataSuite.symptomVariations, null, 2), 'utf-8');
    filesGenerated.push(symptomVariationsPath);

    // Write risk assessment cases
    const riskAssessmentPath = join(dataDir, 'risk-assessment-cases.json');
    writeFileSync(riskAssessmentPath, JSON.stringify(testDataSuite.riskAssessmentCases, null, 2), 'utf-8');
    filesGenerated.push(riskAssessmentPath);

    // Write care pathway cases
    const carePathwayPath = join(dataDir, 'care-pathway-cases.json');
    writeFileSync(carePathwayPath, JSON.stringify(testDataSuite.carePathwayCases, null, 2), 'utf-8');
    filesGenerated.push(carePathwayPath);

    // Write edge cases
    const edgeCasesPath = join(dataDir, 'edge-cases.json');
    writeFileSync(edgeCasesPath, JSON.stringify(testDataSuite.edgeCases, null, 2), 'utf-8');
    filesGenerated.push(edgeCasesPath);

    // Write test data manifest
    const manifestPath = join(dataDir, 'test-data-manifest.json');
    const manifest = {
      generatedAt: new Date().toISOString(),
      dataTypes: {
        patientProfiles: testDataSuite.patientProfiles.length,
        clinicalScenarios: testDataSuite.clinicalScenarios.length,
        symptomVariations: testDataSuite.symptomVariations.length,
        riskAssessmentCases: testDataSuite.riskAssessmentCases.length,
        carePathwayCases: testDataSuite.carePathwayCases.length,
        edgeCases: testDataSuite.edgeCases.length
      },
      totalDataPoints: this.calculateDataPoints(testDataSuite),
      files: filesGenerated.map(f => f.replace(process.cwd(), '.')),
      usage: {
        description: 'Synthetic medical test data for triage system validation',
        compliance: 'HIPAA-compliant synthetic data only',
        restrictions: 'For testing purposes only - not real patient data'
      }
    };
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    filesGenerated.push(manifestPath);

    logger.info('Medical test data files written', {
      filesGenerated: filesGenerated.length,
      totalDataPoints: manifest.totalDataPoints
    });

    return filesGenerated;
  }

  private calculateDataPoints(testDataSuite: MedicalTestDataSuite): number {
    return testDataSuite.patientProfiles.length +
           testDataSuite.clinicalScenarios.length +
           testDataSuite.symptomVariations.length +
           testDataSuite.riskAssessmentCases.length +
           testDataSuite.carePathwayCases.length +
           testDataSuite.edgeCases.length;
  }

  // Fallback data generation methods
  private generateFallbackPatientProfiles(): PatientProfile[] {
    return [
      {
        id: 'patient-001',
        demographics: {
          age: 45,
          gender: 'female',
          ethnicity: 'Hispanic',
          primaryLanguage: 'English'
        },
        medicalHistory: {
          conditions: ['Type 2 Diabetes', 'Hypertension'],
          medications: ['Metformin', 'Lisinopril'],
          allergies: ['Penicillin'],
          surgeries: ['Appendectomy 2010']
        },
        riskFactors: ['Family history of heart disease', 'Obesity'],
        insuranceStatus: 'Insured',
        preferredCommunication: 'patient'
      },
      {
        id: 'patient-002',
        demographics: {
          age: 72,
          gender: 'male',
          ethnicity: 'Caucasian',
          primaryLanguage: 'English'
        },
        medicalHistory: {
          conditions: ['COPD', 'Atrial Fibrillation', 'Osteoarthritis'],
          medications: ['Albuterol', 'Warfarin', 'Ibuprofen'],
          allergies: ['Aspirin'],
          surgeries: ['Knee replacement 2018']
        },
        riskFactors: ['Smoking history', 'Advanced age'],
        insuranceStatus: 'Medicare',
        preferredCommunication: 'clinician'
      }
    ];
  }

  private generateFallbackClinicalScenarios(): ClinicalScenario[] {
    return [
      {
        id: 'scenario-001',
        name: 'Acute Chest Pain Emergency',
        category: 'emergency',
        chiefComplaint: 'Severe crushing chest pain',
        presentingSymptoms: ['chest pain', 'diaphoresis', 'nausea', 'left arm pain'],
        duration: '45 minutes',
        severity: 9,
        associatedSymptoms: ['shortness of breath', 'anxiety'],
        redFlags: ['chest pain with radiation', 'diaphoresis', 'severe pain'],
        expectedDisposition: 'ED',
        expectedRiskLevel: 'immediate',
        snomedCodes: ['29857009'],
        icd10Codes: ['R06.02']
      },
      {
        id: 'scenario-002',
        name: 'Upper Respiratory Infection',
        category: 'routine',
        chiefComplaint: 'Cold symptoms for 3 days',
        presentingSymptoms: ['runny nose', 'cough', 'mild headache'],
        duration: '3 days',
        severity: 3,
        associatedSymptoms: ['fatigue', 'low-grade fever'],
        redFlags: [],
        expectedDisposition: 'Primary Care',
        expectedRiskLevel: 'routine',
        snomedCodes: ['82272006'],
        icd10Codes: ['J06.9']
      }
    ];
  }

  private generateFallbackSymptomVariations(): SymptomVariation[] {
    return [
      {
        baseSymptom: 'chest pain',
        variations: {
          mild: ['slight chest discomfort', 'minor chest tightness'],
          moderate: ['noticeable chest pain', 'uncomfortable chest pressure'],
          severe: ['crushing chest pain', 'excruciating chest pain', 'worst chest pain ever']
        },
        synonyms: ['chest discomfort', 'chest pressure', 'chest tightness'],
        commonMisspellings: ['chesst pain', 'chest paine', 'cheast pain'],
        culturalVariations: [
          { language: 'Spanish', term: 'dolor de pecho', description: 'chest pain' }
        ],
        ageSpecific: {
          pediatric: ['chest hurts', 'chest feels funny'],
          adult: ['chest pain', 'chest discomfort'],
          geriatric: ['chest heaviness', 'chest pressure']
        }
      }
    ];
  }

  private generateFallbackRiskAssessmentCases(): RiskAssessmentCase[] {
    return [
      {
        id: 'risk-001',
        scenario: 'Chest pain with red flags',
        patientData: {
          symptoms: ['crushing chest pain', 'left arm radiation', 'diaphoresis'],
          duration: '30 minutes',
          severity: 9,
          age: 55,
          riskFactors: ['smoking', 'hypertension']
        },
        expectedRiskScore: 95,
        expectedRiskLevel: 'immediate',
        riskFactors: ['chest pain with radiation', 'diaphoresis', 'cardiac risk factors'],
        redFlagsPresent: ['chest pain + diaphoresis + radiation'],
        confidenceThreshold: 0.95,
        reasoning: 'Deterministic red flags present indicating possible acute coronary syndrome'
      }
    ];
  }

  private generateFallbackCarePathwayCases(): CarePathwayCase[] {
    return [
      {
        id: 'pathway-001',
        riskAssessment: { level: 'immediate', score: 95 },
        expectedDisposition: 'Emergency Department immediately',
        urgencyLevel: 'immediate',
        safetyNetting: [
          'Call 911 if not already in hospital',
          'Do not delay seeking care',
          'Inform medical staff of chest pain immediately'
        ],
        followUpInstructions: 'Emergency department evaluation required',
        escalationTriggers: ['worsening pain', 'new symptoms', 'loss of consciousness'],
        costConsiderations: 'Emergency care priority over cost concerns'
      }
    ];
  }

  private generateFallbackEdgeCases(): EdgeCase[] {
    return [
      {
        id: 'edge-001',
        type: 'ambiguous',
        description: 'Vague symptom description requiring clarification',
        input: 'I just dont feel right, something is wrong but I cant explain it',
        expectedBehavior: 'Request clarifying questions about specific symptoms',
        challengeArea: 'Symptom parsing and clarification handling'
      },
      {
        id: 'edge-002',
        type: 'conflicting',
        description: 'Conflicting symptom descriptions in same input',
        input: 'My chest pain is mild but also the worst pain Ive ever had',
        expectedBehavior: 'Acknowledge conflict and ask for clarification on severity',
        challengeArea: 'Inconsistent symptom parsing'
      }
    ];
  }
}