// Vector Store Interface for Memory Augmented RAG
export interface VectorStore {
  storeCaseOutcome(caseMemory: CaseMemory): Promise<void>;
  findSimilarCases(symptomEmbedding: number[], demographics?: any, limit?: number): Promise<SearchResult[]>;
  storeMedicalKnowledge(knowledge: MedicalKnowledge): Promise<void>;
  searchMedicalKnowledge(queryEmbedding: number[], domain?: string, limit?: number): Promise<MedicalKnowledge[]>;
  healthCheck(): Promise<boolean>;
}

// Case Memory: Learn from outcomes
export interface CaseMemory {
  caseId: string;
  symptoms: string;
  symptomEmbedding: number[];
  initialTriage: 'immediate' | 'urgent' | 'routine';
  actualOutcome: 'correct' | 'under_triaged' | 'over_triaged';
  demographics: {
    age: number;
    gender: string;
    comorbidities: string[];
  };
  timestamp: string;
  followUpNotes?: string;
  lessonsLearned?: string[];
}

// Medical Knowledge: Evidence-based updates
export interface MedicalKnowledge {
  knowledgeId: string;
  content: string;
  contentEmbedding?: number[];
  source: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'Expert Opinion';
  lastUpdated: string;
  clinicalDomain: 'cardiology' | 'neurology' | 'emergency' | 'general';
  citations: string[];
  relevanceScore?: number;
}

// Search Results
export interface SearchResult {
  caseId: string;
  symptoms: string;
  initialTriage: string;
  actualOutcome: string;
  similarity: number;
  lessonsLearned?: string[];
}

// Embedding Service Interface
export interface EmbeddingService {
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}