import { z } from 'zod';

// --- NEW: taxonomy enums
export const RiskBand = z.enum(["immediate","urgent","routine"]);
export const OpsPriority = z.enum(["immediate","urgent","routine","batch"]);
export const TestCategory = z.enum(["emergency","urgent","routine","edge-case"]);

// Core data schemas matching the project specification
export const ClinicalEvidence = z.object({
  patientId: z.string(),
  presentingComplaint: z.string(),
  features: z.object({
    onset: z.string().optional(),
    severity: z.number().min(0).max(10).optional(),
    radiation: z.string().optional(),
    associated: z.array(z.string()).optional(),
    vitals: z.object({
      bp: z.string().optional(),
      hr: z.number().optional(),
      spo2: z.number().optional(),
      rr: z.number().optional(),
      temp: z.number().optional(),
    }).partial().optional(),
    redFlags: z.array(z.string()).optional(),
  }),
  codes: z.array(z.object({
    system: z.string(),
    code: z.string(),
    term: z.string()
  })).optional(),
  meds: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
});

export type TClinicalEvidence = z.infer<typeof ClinicalEvidence>;

export const RiskAssessment = z.object({
  band: RiskBand,
  pUrgent: z.number().min(0).max(1),
  explain: z.array(z.string()),
  requiredInvestigations: z.array(z.string()).optional(),
  differentials: z.array(z.string()).optional(),
});

export type TRiskAssessment = z.infer<typeof RiskAssessment>;

export const CarePlan = z.object({
  disposition: z.string(),
  why: z.array(z.string()),
  whatToExpect: z.array(z.string()).optional(),
  safetyNet: z.array(z.string()).optional(),
  timeframe: z.string().optional(),
  followUp: z.string().optional(),
});

export type TCarePlan = z.infer<typeof CarePlan>;

// --- NEW: routing metadata (derived)
export const RoutingMeta = z.object({
  priority: OpsPriority,
  testCategory: TestCategory.optional(),
});
export type TRoutingMeta = z.infer<typeof RoutingMeta>;

export const TriageRequest = z.object({
  mode: z.enum(['patient', 'clinician']).default('clinician'),
  input: z.object({
    text: z.string().min(5, 'Please provide more detail about your symptoms'),
    voiceData: z.any().optional(), // Future: voice input support
  }),
  patientId: z.string(),
  patientContext: z.object({
    age: z.number().min(0).max(120).optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
    existingConditions: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    anxietyLevel: z.enum(['low', 'medium', 'high']).optional(),
    healthLiteracy: z.enum(['basic', 'intermediate', 'advanced']).optional(),
    culturalConsiderations: z.array(z.string()).optional(),
    preferredLanguage: z.string().optional(),
  }).optional(),
  preferences: z.object({
    provider: z.enum(['openai', 'anthropic']).optional(),
    enableBatching: z.boolean().default(false),
    enableCaching: z.boolean().default(true),
  }).optional(),
});

export type TTriageRequest = z.infer<typeof TriageRequest>;

export const TriageResponse = z.object({
  evidence: ClinicalEvidence,
  risk: RiskAssessment,
  plan: CarePlan,
  adaptedResponse: z.object({
    disposition: z.string(),
    explanation: z.array(z.string()),
    whatToExpect: z.array(z.string()),
    safetyNet: z.array(z.string()),
    reassurance: z.array(z.string()).optional(),
    nextSteps: z.array(z.string()),
  }),
  confidence: z.number().min(0).max(1),
  citations: z.array(z.object({
    source: z.string(),
    snippet: z.string(),
    guideline: z.string().optional(),
  })),
  routing: RoutingMeta, // <-- NEW
  traceId: z.string(),
  processingTime: z.number(),
  costMetrics: z.object({
    tokensUsed: z.number(),
    modelUsed: z.string(),
    estimatedCost: z.number(),
    provider: z.enum(['openai', 'anthropic']),
  }).optional(),
  clarifyingQuestions: z.array(z.string()).optional(), // When more info needed
});

export type TTriageResponse = z.infer<typeof TriageResponse>;

// Error response schema
export const ErrorResponse = z.object({
  error: z.object({
    type: z.string(),
    message: z.string(),
    code: z.string().optional(),
    details: z.record(z.any()).optional(),
  }),
  traceId: z.string(),
  timestamp: z.string(),
});

export type TErrorResponse = z.infer<typeof ErrorResponse>;

// Health check schema
export const HealthCheckResponse = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  version: z.string(),
  agents: z.object({
    symptomParser: z.boolean(),
    riskStratifier: z.boolean(),
    carePathwayPlanner: z.boolean(),
    empathyCoach: z.boolean(),
    conductor: z.boolean(),
  }),
  providers: z.object({
    openai: z.object({
      available: z.boolean(),
      responseTime: z.number().optional(),
    }).optional(),
    anthropic: z.object({
      available: z.boolean(),
      responseTime: z.number().optional(),
    }).optional(),
  }),
  costOptimizations: z.object({
    cachingEnabled: z.boolean(),
    batchingEnabled: z.boolean(),
    smartRouting: z.boolean(),
  }),
});

export type THealthCheckResponse = z.infer<typeof HealthCheckResponse>;

// Batch triage request schema (for processing multiple cases)
export const BatchTriageRequest = z.object({
  requests: z.array(TriageRequest).min(1).max(100), // Limit batch size
  batchId: z.string().optional(),
  priority: z.enum(['immediate', 'urgent', 'routine', 'batch']).default('batch'),
  preferences: z.object({
    provider: z.enum(['openai', 'anthropic']).optional(),
    enableBatching: z.boolean().default(true),
    maxConcurrency: z.number().min(1).max(10).default(5),
  }).optional(),
});

export type TBatchTriageRequest = z.infer<typeof BatchTriageRequest>;

export const BatchTriageResponse = z.object({
  batchId: z.string(),
  results: z.array(TriageResponse),
  summary: z.object({
    total: z.number(),
    successful: z.number(),
    failed: z.number(),
    processingTime: z.number(),
    costMetrics: z.object({
      totalTokens: z.number(),
      totalCost: z.number(),
      averageCostPerRequest: z.number(),
      provider: z.enum(['openai', 'anthropic']),
    }),
  }),
  timestamp: z.string(),
});

export type TBatchTriageResponse = z.infer<typeof BatchTriageResponse>;

// Demo scenarios schema
export const DemoScenario = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  input: z.object({
    text: z.string(),
    patientId: z.string(),
    mode: z.enum(['patient', 'clinician']).default('patient'),
    patientContext: z.object({
      age: z.number().optional(),
      gender: z.string().optional(),
      existingConditions: z.array(z.string()).optional(),
    }).optional(),
  }),
  expectedOutcome: z.object({
    riskBand: z.enum(['immediate', 'urgent', 'routine']),
    disposition: z.string(),
    shouldTriggerRedFlags: z.boolean(),
  }),
  category: z.enum(['emergency', 'urgent', 'routine', 'edge-case']),
});

export type TDemoScenario = z.infer<typeof DemoScenario>;

// Validation helpers
export const validateTriageRequest = (data: unknown): TTriageRequest => {
  return TriageRequest.parse(data);
};

export const validateTriageResponse = (data: unknown): TTriageResponse => {
  return TriageResponse.parse(data);
};

// Custom validation for medical safety
export const validateMedicalSafety = (evidence: TClinicalEvidence): {
  isValid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  // Check for critical red flags that should never be missed
  const criticalRedFlags = [
    'chest pain',
    'difficulty breathing',
    'severe headache',
    'suicidal',
    'overdose',
    'anaphylaxis'
  ];

  const text = evidence.presentingComplaint.toLowerCase();
  const hasCriticalSymptoms = criticalRedFlags.some(flag => text.includes(flag));

  if (hasCriticalSymptoms && (!evidence.features.redFlags || evidence.features.redFlags.length === 0)) {
    issues.push('Potential critical symptoms detected but no red flags identified');
  }

  // Validate severity consistency
  if (evidence.features.severity >= 8 && evidence.features.redFlags?.length === 0) {
    issues.push('High severity reported but no red flags - requires review');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};