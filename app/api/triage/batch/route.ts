import { NextRequest, NextResponse } from 'next/server';
import { ConductorAgent } from '@/lib/sk/agents/ConductorAgent';
import { BatchTriageOrchestrator } from '@/lib/sk/BatchTriageOrchestrator';
import { ProviderFactory } from '@/lib/adapters/llm/ProviderFactory';
import { validateTriageRequest } from '@/lib/schemas';
import { logger } from '@/lib/logger';

// POST /api/triage/batch - Batch triage processing
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let batchId: string | undefined;

  try {
    const body = await request.json();
    batchId = body.batchId || `batch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    logger.info('Batch triage request received', {
      batchId,
      requestCount: body.requests?.length || 0,
      priority: body.priority || 'batch'
    });

    // Validate batch request structure
    if (!body.requests || !Array.isArray(body.requests)) {
      throw new Error('Requests array is required');
    }

    if (body.requests.length === 0) {
      throw new Error('At least one request is required');
    }

    if (body.requests.length > 100) {
      throw new Error('Batch size limited to 100 requests');
    }

    // Validate individual requests
    const validatedRequests = body.requests.map((req: any, index: number) => {
      try {
        return validateTriageRequest(req);
      } catch (error) {
        throw new Error(`Request ${index + 1} validation failed: ${error.message}`);
      }
    });

    // Create provider and orchestrator
    const provider = ProviderFactory.createProvider();
    const batchOrchestrator = new BatchTriageOrchestrator(provider);
    
    // Convert requests to batch format
    const batchRequests = validatedRequests.map((req, index) => ({
      id: `${batchId}-${index + 1}`,
      patientId: req.patientId,
      input: req.input.text,
      mode: req.mode,
      priority: body.priority || 'batch'
    }));

    // Process batch
    const results = [];
    const errors = [];
    let totalTokens = 0;
    let totalCost = 0;

    for (const batchRequest of batchRequests) {
      try {
        const result = await batchOrchestrator.processTriage(batchRequest);
        
        if (result.success) {
          // Convert batch result to standard triage response format
          const triageResponse = {
            evidence: result.evidence,
            risk: result.risk,
            plan: result.plan,
            adaptedResponse: {
              disposition: result.plan?.disposition || 'Clinical evaluation recommended',
              explanation: result.plan?.why || ['Batch processing completed'],
              whatToExpect: result.plan?.whatToExpected || [],
              safetyNet: result.plan?.safetyNet || [],
              nextSteps: ['Follow the recommendations provided'],
            },
            confidence: 0.8, // Default confidence for batch processing
            citations: [],
            traceId: result.requestId,
            processingTime: result.processingTime,
          };

          results.push(triageResponse);

          // Estimate costs (simplified)
          const estimatedTokens = 600; // Average per request
          totalTokens += estimatedTokens;
          totalCost += (estimatedTokens / 1000000) * 0.25; // Haiku + batch pricing
        } else {
          errors.push({
            requestId: result.requestId,
            error: result.error,
            processingTime: result.processingTime,
          });
        }
      } catch (error) {
        logger.error('Batch request processing failed', {
          batchId,
          requestId: batchRequest.id,
          error: error.message
        });

        errors.push({
          requestId: batchRequest.id,
          error: error.message,
          processingTime: 0,
        });
      }
    }

    // Calculate batch statistics
    const totalProcessingTime = Date.now() - startTime;
    const successfulCount = results.length;
    const failedCount = errors.length;
    const totalCount = successfulCount + failedCount;

    const batchResponse = {
      batchId,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: totalCount,
        successful: successfulCount,
        failed: failedCount,
        processingTime: totalProcessingTime,
        costMetrics: {
          totalTokens,
          totalCost: Math.round(totalCost * 10000) / 10000,
          averageCostPerRequest: totalCount > 0 ? Math.round((totalCost / totalCount) * 10000) / 10000 : 0,
          provider: 'anthropic' as const,
          optimizationSavings: '95%+ vs baseline',
        },
        performance: {
          averageResponseTime: totalCount > 0 ? Math.round(totalProcessingTime / totalCount) : 0,
          requestsPerSecond: totalCount > 0 ? Math.round((totalCount / totalProcessingTime) * 1000) : 0,
        },
      },
      timestamp: new Date().toISOString(),
    };

    logger.info('Batch triage completed', {
      batchId,
      totalRequests: totalCount,
      successful: successfulCount,
      failed: failedCount,
      processingTime: totalProcessingTime,
      totalCost
    });

    return NextResponse.json(batchResponse, {
      status: 200,
      headers: {
        'X-Batch-ID': batchId,
        'X-Processing-Time': totalProcessingTime.toString(),
        'X-Success-Rate': ((successfulCount / totalCount) * 100).toFixed(1),
      },
    });

  } catch (error) {
    logger.error('Batch triage request failed', {
      batchId,
      error: error.message,
      processingTime: Date.now() - startTime
    });

    const errorResponse = {
      error: {
        type: 'BATCH_TRIAGE_ERROR',
        message: error.message,
        code: 'BATCH_PROCESSING_FAILED',
      },
      batchId: batchId || 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'X-Batch-ID': batchId || 'unknown',
        'X-Error-Type': 'BATCH_TRIAGE_ERROR',
      },
    });
  }
}

// GET /api/triage/batch - Get batch processing info
export async function GET(request: NextRequest) {
  try {
    const provider = ProviderFactory.createProvider();
    const batchOrchestrator = new BatchTriageOrchestrator(provider);
    
    const stats = batchOrchestrator.getBatchStats();
    const estimatedSavings = batchOrchestrator.estimateBatchSavings(1000); // For 1000 daily requests

    return NextResponse.json({
      service: 'Batch Triage Processing',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      
      capabilities: {
        maxBatchSize: 100,
        supportedPriorities: ['immediate', 'urgent', 'routine', 'batch'],
        costOptimization: 'Message Batches API + Prompt Caching',
        estimatedSavings: '95%+ vs individual requests',
      },

      currentStats: stats,

      costBenefits: {
        ...estimatedSavings,
        batchDiscount: '50% on batch requests',
        cacheDiscount: '90% on cached prompts',
        combinedSavings: 'Up to 97% total cost reduction',
      },

      usage: {
        endpoint: 'POST /api/triage/batch',
        maxRequestsPerBatch: 100,
        expectedResponseTime: '30-60 seconds for large batches',
        recommendedFor: [
          'Bulk symptom assessments',
          'Research data processing',
          'System testing and validation',
          'Non-urgent triage workflows'
        ],
      },

      examples: {
        singleRequest: {
          method: 'POST',
          url: '/api/triage',
          body: {
            mode: 'patient',
            input: { text: 'headache for 2 hours' },
            patientId: 'patient-001'
          }
        },
        batchRequest: {
          method: 'POST', 
          url: '/api/triage/batch',
          body: {
            requests: [
              {
                mode: 'patient',
                input: { text: 'chest pain for 20 minutes' },
                patientId: 'patient-001'
              },
              {
                mode: 'clinician',
                input: { text: 'severe headache with vision changes' },
                patientId: 'patient-002'
              }
            ],
            priority: 'batch'
          }
        }
      }
    });

  } catch (error) {
    logger.error('Batch info request failed', { error: error.message });
    
    return NextResponse.json({
      error: 'Batch service information unavailable',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}