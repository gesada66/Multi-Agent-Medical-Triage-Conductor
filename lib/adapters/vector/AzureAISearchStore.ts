import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { VectorStore, CaseMemory, MedicalKnowledge, SearchResult } from './types';
import { logger } from '../../logger';

export interface AzureSearchConfig {
  serviceName: string;
  adminKey: string;
  apiVersion: string;
  indexName: string;
}

export class AzureAISearchStore implements VectorStore {
  private client: SearchClient;
  private config: AzureSearchConfig;

  constructor(config: AzureSearchConfig) {
    this.config = config;
    const endpoint = `https://${config.serviceName}.search.windows.net`;
    this.client = new SearchClient(
      endpoint,
      config.indexName,
      new AzureKeyCredential(config.adminKey)
    );
  }

  // Memory Augmented RAG: Store case outcomes for learning
  async storeCaseOutcome(caseMemory: CaseMemory): Promise<void> {
    try {
      const document = {
        id: caseMemory.caseId,
        symptoms: caseMemory.symptoms,
        symptoms_vector: caseMemory.symptomEmbedding, // Vector representation
        initial_triage: caseMemory.initialTriage,
        actual_outcome: caseMemory.actualOutcome,
        demographics: caseMemory.demographics,
        timestamp: caseMemory.timestamp,
        follow_up_notes: caseMemory.followUpNotes,
        lessons_learned: caseMemory.lessonsLearned
      };

      await this.client.uploadDocuments([document]);
      logger.info('Stored case outcome for learning', { 
        caseId: caseMemory.caseId,
        outcome: caseMemory.actualOutcome 
      });
    } catch (error) {
      logger.error('Failed to store case outcome', { error: error.message });
      throw error;
    }
  }

  // Memory Augmented RAG: Retrieve similar historical cases
  async findSimilarCases(
    symptomEmbedding: number[], 
    demographics?: any,
    limit = 5
  ): Promise<SearchResult[]> {
    try {
      const searchOptions = {
        vector: {
          value: symptomEmbedding,
          k: limit,
          fields: 'symptoms_vector'
        },
        select: [
          'id', 'symptoms', 'initial_triage', 'actual_outcome', 
          'demographics', 'lessons_learned'
        ],
        filter: demographics ? this.buildDemographicFilter(demographics) : undefined,
        top: limit
      };

      const results = await this.client.search('*', searchOptions);
      
      const similarCases: SearchResult[] = [];
      for await (const result of results.results) {
        similarCases.push({
          caseId: result.document.id,
          symptoms: result.document.symptoms,
          initialTriage: result.document.initial_triage,
          actualOutcome: result.document.actual_outcome,
          similarity: result.score || 0,
          lessonsLearned: result.document.lessons_learned
        });
      }

      logger.info('Retrieved similar cases', { 
        count: similarCases.length,
        avgSimilarity: similarCases.reduce((sum, c) => sum + c.similarity, 0) / similarCases.length
      });

      return similarCases;
    } catch (error) {
      logger.error('Failed to find similar cases', { error: error.message });
      throw error;
    }
  }

  // Memory Augmented RAG: Store updated medical knowledge
  async storeMedicalKnowledge(knowledge: MedicalKnowledge): Promise<void> {
    try {
      const document = {
        id: knowledge.knowledgeId,
        content: knowledge.content,
        content_vector: knowledge.contentEmbedding,
        source: knowledge.source,
        evidence_level: knowledge.evidenceLevel,
        last_updated: knowledge.lastUpdated,
        clinical_domain: knowledge.clinicalDomain,
        citations: knowledge.citations
      };

      await this.client.uploadDocuments([document]);
      logger.info('Stored medical knowledge', { 
        knowledgeId: knowledge.knowledgeId,
        domain: knowledge.clinicalDomain 
      });
    } catch (error) {
      logger.error('Failed to store medical knowledge', { error: error.message });
      throw error;
    }
  }

  // Memory Augmented RAG: Retrieve relevant medical knowledge
  async searchMedicalKnowledge(
    queryEmbedding: number[],
    domain?: string,
    limit = 3
  ): Promise<MedicalKnowledge[]> {
    try {
      const searchOptions = {
        vector: {
          value: queryEmbedding,
          k: limit,
          fields: 'content_vector'
        },
        select: [
          'id', 'content', 'source', 'evidence_level', 
          'clinical_domain', 'citations'
        ],
        filter: domain ? `clinical_domain eq '${domain}'` : undefined,
        top: limit
      };

      const results = await this.client.search('*', searchOptions);
      
      const knowledge: MedicalKnowledge[] = [];
      for await (const result of results.results) {
        knowledge.push({
          knowledgeId: result.document.id,
          content: result.document.content,
          source: result.document.source,
          evidenceLevel: result.document.evidence_level,
          clinicalDomain: result.document.clinical_domain,
          citations: result.document.citations,
          relevanceScore: result.score || 0
        });
      }

      return knowledge;
    } catch (error) {
      logger.error('Failed to search medical knowledge', { error: error.message });
      return [];
    }
  }

  private buildDemographicFilter(demographics: any): string {
    const filters = [];
    if (demographics.ageRange) {
      filters.push(`demographics/age_range eq '${demographics.ageRange}'`);
    }
    if (demographics.gender) {
      filters.push(`demographics/gender eq '${demographics.gender}'`);
    }
    return filters.join(' and ');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getDocumentsCount();
      return true;
    } catch (error) {
      logger.error('Azure AI Search health check failed', { error: error.message });
      return false;
    }
  }
}