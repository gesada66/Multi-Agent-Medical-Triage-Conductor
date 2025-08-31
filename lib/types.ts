import { z } from 'zod';

// Patient data schemas
export const PatientSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().min(0).max(120),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
  medicalHistory: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
});

export type Patient = z.infer<typeof PatientSchema>;

// Mode toggle
export const TriageModeSchema = z.enum(['patient', 'clinician']);
export type TriageMode = z.infer<typeof TriageModeSchema>;

// Symptom input
export const SymptomInputSchema = z.object({
  text: z.string().min(5, 'Please provide more detail about symptoms'),
  voiceData: z.any().optional(),
});

export type SymptomInput = z.infer<typeof SymptomInputSchema>;

// Risk assessment
export const RiskBandSchema = z.enum(['immediate', 'urgent', 'routine']);
export type RiskBand = z.infer<typeof RiskBandSchema>;

export const RiskAssessmentSchema = z.object({
  band: RiskBandSchema,
  probability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  redFlags: z.array(z.string()),
  evidence: z.array(z.string()),
  reasoning: z.string().optional(),
});

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

// Care plan
export const CarePlanSchema = z.object({
  disposition: z.string(),
  why: z.array(z.string()),
  whatToExpected: z.array(z.string()).optional(),
  safetyNet: z.array(z.string()).optional(),
  timeframe: z.string().optional(),
  followUp: z.string().optional(),
  investigations: z.array(z.string()).optional(),
  treatments: z.array(z.string()).optional(),
});

export type CarePlan = z.infer<typeof CarePlanSchema>;

// Timeline entry
export const TimelineEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  event: z.string(),
  details: z.string().optional(),
  type: z.enum(['symptom', 'investigation', 'treatment', 'assessment']),
});

export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

// Citations and evidence for rationale
export const CitationSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  url: z.string().url().optional(),
  confidence: z.number().min(0).max(1).optional(),
  excerpt: z.string().optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

export const RationaleSchema = z.object({
  reasoning: z.string(),
  evidence: z.record(z.any()), // Raw evidence JSON
  citations: z.array(CitationSchema),
  agentInsights: z.record(z.any()).optional(),
});

export type Rationale = z.infer<typeof RationaleSchema>;

// Main triage response
export const TriageResponseSchema = z.object({
  success: z.boolean(),
  patientId: z.string(),
  mode: TriageModeSchema,
  timestamp: z.string().datetime(),
  processingTime: z.number(),
  
  // Core analysis results
  riskAssessment: RiskAssessmentSchema,
  carePlan: CarePlanSchema,
  rationale: RationaleSchema,
  
  // Supporting data
  timeline: z.array(TimelineEntrySchema).optional(),
  
  // System metadata
  modelUsed: z.string().optional(),
  confidence: z.number().min(0).max(1),
  
  // Error handling
  error: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

export type TriageResponse = z.infer<typeof TriageResponseSchema>;

// Request schema
export const TriageRequestSchema = z.object({
  mode: TriageModeSchema.default('clinician'),
  input: SymptomInputSchema,
  patientId: z.string(),
  patientContext: z.object({
    age: z.number().min(0).max(120).optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
    existingConditions: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
  }).optional(),
});

export type TriageRequest = z.infer<typeof TriageRequestSchema>;

// UI State schemas
export const UIStateSchema = z.object({
  isLoading: z.boolean(),
  selectedPatient: PatientSchema.nullable(),
  mode: TriageModeSchema,
  symptoms: z.string(),
  lastResult: TriageResponseSchema.nullable(),
  error: z.string().nullable(),
});

export type UIState = z.infer<typeof UIStateSchema>;

// Risk band descriptions for tooltips
export const RISK_BAND_DESCRIPTIONS = {
  immediate: 'Life-threatening condition requiring immediate medical attention',
  urgent: 'Serious condition requiring urgent medical assessment within 1 hour', 
  routine: 'Non-urgent condition that can be managed through routine care'
} as const;

// Mock patients for development
export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'patient-1',
    name: 'John Carter',
    age: 45,
    gender: 'male',
    medicalHistory: ['Hypertension', 'Type 2 Diabetes'],
    medications: ['Metformin', 'Lisinopril'],
    allergies: ['Penicillin']
  },
  {
    id: 'patient-2', 
    name: 'Sarah Johnson',
    age: 32,
    gender: 'female',
    medicalHistory: ['Asthma'],
    medications: ['Albuterol inhaler'],
    allergies: []
  },
  {
    id: 'patient-3',
    name: 'Robert Chen',
    age: 67,
    gender: 'male', 
    medicalHistory: ['Coronary Artery Disease', 'COPD'],
    medications: ['Aspirin', 'Atorvastatin', 'Albuterol'],
    allergies: ['Sulfa drugs']
  }
];