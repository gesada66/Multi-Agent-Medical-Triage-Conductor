import { NextRequest, NextResponse } from 'next/server';
import { ConductorAgent } from '../../../lib/sk/agents/ConductorAgent';
import { ProviderFactory } from '../../../lib/adapters/llm/ProviderFactory';
import { validateTriageRequest, validateMedicalSafety } from '../../../lib/schemas';
import { logger } from '../../../lib/logger';
import { headers } from 'next/headers';

// POST /api/triage - Main triage endpoint
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let traceId: string | undefined;

  try {
    // Parse and validate request
    const body = await request.json();
    const validatedRequest = validateTriageRequest(body);
    
    traceId = `api-triage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Triage API request received', {
      traceId,
      patientId: validatedRequest.patientId,
      mode: validatedRequest.mode,
      hasPatientContext: !!validatedRequest.patientContext,
      preferredProvider: validatedRequest.preferences?.provider
    });

    // Create provider based on preferences or fallback to config
    const provider = createProvider(validatedRequest.preferences?.provider);

    // Initialize conductor agent with selected provider
    const conductor = await ConductorAgent.create(provider);

    // Execute triage workflow
    const triageResult = await conductor.conductTriage({
      mode: validatedRequest.mode,
      input: validatedRequest.input,
      patientId: validatedRequest.patientId,
      patientContext: validatedRequest.patientContext,
    });

    // Additional medical safety validation
    const safetyCheck = validateMedicalSafety(triageResult.evidence);
    if (!safetyCheck.isValid) {
      logger.warn('Medical safety validation issues detected', {
        traceId,
        issues: safetyCheck.issues,
        patientId: validatedRequest.patientId
      });

      // Add safety warnings to response
      triageResult.adaptedResponse.safetyNet.unshift(
        ...safetyCheck.issues.map(issue => `⚠️ ${issue}`)
      );
    }

    // Add cost metrics if available
    const costMetrics = calculateCostMetrics(
      triageResult,
      validatedRequest.preferences?.provider || 'anthropic'
    );

    const response = {
      ...triageResult,
      costMetrics,
      processingTime: Date.now() - startTime
    };

    logger.info('Triage API request completed successfully', {
      traceId,
      patientId: validatedRequest.patientId,
      riskBand: response.risk.band,
      confidence: response.confidence,
      processingTime: response.processingTime,
      estimatedCost: costMetrics.estimatedCost
    });

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'X-Trace-ID': traceId,
        'X-Processing-Time': response.processingTime.toString(),
        'X-Risk-Band': response.risk.band,
      }
    });

  } catch (error) {
    logger.error('Triage API request failed', {
      traceId,
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime
    });

    // Return structured error response
    const errorResponse = {
      error: {
        type: 'TRIAGE_ERROR',
        message: error.message || 'An error occurred during triage processing',
        code: error.code || 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          timestamp: new Date().toISOString()
        } : undefined
      },
      traceId: traceId || 'unknown',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'X-Trace-ID': traceId || 'unknown',
        'X-Error-Type': 'TRIAGE_ERROR',
      }
    });
  }
}

// GET /api/triage - Get triage system info (for testing)
export async function GET(request: NextRequest) {
  try {
    const provider = createProvider();
    const conductor = await ConductorAgent.create(provider);
    
    const healthCheck = await conductor.healthCheck();
    
    return NextResponse.json({
      service: 'Multi-Agent Medical Triage Conductor',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      health: healthCheck,
      supportedProviders: ['openai', 'anthropic'],
      features: [
        'AI-Generated Medical Logic',
        'Cost-Optimized Processing',
        'Multi-Agent Workflow',
        'Patient/Clinician Modes',
        'Batch Processing Support',
        'Real-time Risk Assessment'
      ],
      endpoints: {
        triage: 'POST /api/triage',
        batch: 'POST /api/triage/batch',
        health: 'GET /api/health'
      }
    });

  } catch (error) {
    logger.error('Triage info request failed', { error: error.message });
    
    return NextResponse.json({
      error: 'Service information unavailable',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

// Helper function to create provider based on preferences
function createProvider(preferredProvider?: 'openai' | 'anthropic') {
  const config = {
    modelProvider: preferredProvider || process.env.MODEL_PROVIDER || 'anthropic'
  };

  // Temporarily override config for this request
  if (preferredProvider) {
    process.env.MODEL_PROVIDER = preferredProvider;
  }

  try {
    const provider = ProviderFactory.createProvider();
    return provider;
  } finally {
    // Restore original config if we overrode it
    if (preferredProvider) {
      process.env.MODEL_PROVIDER = process.env.MODEL_PROVIDER || 'anthropic';
    }
  }
}

// Helper function to calculate cost metrics
function calculateCostMetrics(
  triageResult: any,
  provider: string
): {
  tokensUsed: number;
  modelUsed: string;
  estimatedCost: number;
  provider: 'openai' | 'anthropic';
} {
  // Rough estimation - in production, this would track actual usage
  const estimatedInputTokens = 800; // System prompt + user input
  const estimatedOutputTokens = 300; // Typical response length

  let estimatedCost = 0;
  let modelUsed = '';

  if (provider === 'openai') {
    // GPT-4o-mini pricing
    const inputCost = (estimatedInputTokens / 1000000) * 0.50;
    const outputCost = (estimatedOutputTokens / 1000000) * 1.50;
    estimatedCost = inputCost + outputCost;
    modelUsed = 'gpt-4o-mini';
  } else {
    // Anthropic Haiku with optimizations
    const inputCost = (estimatedInputTokens / 1000000) * 0.0125; // Cached + batch pricing
    const outputCost = (estimatedOutputTokens / 1000000) * 0.625; // Batch pricing
    estimatedCost = inputCost + outputCost;
    modelUsed = 'claude-3-5-haiku';
  }

  return {
    tokensUsed: estimatedInputTokens + estimatedOutputTokens,
    modelUsed,
    estimatedCost: Math.round(estimatedCost * 10000) / 10000, // Round to 4 decimal places
    provider: provider as 'openai' | 'anthropic'
  };
}