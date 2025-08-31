# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-Agent Medical Triage Conductor - A comprehensive healthcare triage system using Next.js 14 with TypeScript, Semantic Kernel for multi-agent orchestration, and shadcn/ui components. The system coordinates multiple AI agents to process clinical symptoms and provide risk assessment with care pathway recommendations.

## Tech Stack

**Frontend**: Next.js 14 (App Router), React Server Components, shadcn/ui, Tailwind, Radix, Zod, TanStack Query
**Backend**: Next.js API routes, Semantic Kernel (TypeScript), OpenTelemetry tracing
**Data (Local Mode)**: In-memory FHIR repo, SQLite vector store with better-sqlite3
**Testing**: Vitest, Testing Library, Playwright, Pact, k6, ESLint/Prettier, Axe accessibility

## Common Development Commands

```bash
# Development
pnpm dev                    # Start development server
pnpm build                  # Build for production
pnpm start                  # Start production server

# Testing (run in order - each must pass before proceeding)
pnpm lint                   # ESLint + Prettier
pnpm typecheck             # TypeScript checking
pnpm test                   # Unit tests (Vitest)
pnpm contract              # Contract tests (Pact)
pnpm e2e                   # E2E tests (Playwright)
pnpm perf                  # Performance tests (k6)
pnpm ci                    # Full CI pipeline

# Individual test suites
pnpm test:watch            # Unit tests in watch mode
```

## Architecture Overview

The system uses 5 specialized agents orchestrated by Semantic Kernel:
- **ConductorAgent**: Orchestrates flow, handles clarifying questions
- **SymptomParserAgent**: Extracts structured clinical data from text
- **RiskStratifierAgent**: Applies red-flag rules and computes risk scores
- **CarePathwayPlannerAgent**: Maps symptoms to care dispositions
- **EmpathyCoachAgent**: Adapts output for patient vs clinician audiences

## Key Implementation Rules

1. **Feature-by-feature development**: Each feature must pass ALL tests (unit, integration, e2e, contract, performance) before proceeding to next feature
2. **Contract-first**: All API boundaries use Zod schemas for validation
3. **Security**: OWASP headers, PII redaction in logs, schema validation on all requests
4. **Accessibility**: Every UI change must pass Axe accessibility tests
5. **Performance**: API responses must maintain p95 < 900ms under load
6. **⚠️ API KEY PROTECTION**: ALWAYS disable API keys and enable mock mode when development session ends

## 🚨 CRITICAL: API Key Management

**MANDATORY END-OF-SESSION CHECKLIST:**
- [ ] Comment out all API keys in `.env.local`
- [ ] Set `MOCK_LLM_RESPONSES=true`
- [ ] Kill all development servers (`npm run dev`, `pnpm dev`)
- [ ] Verify no Node.js processes consuming API credits

**Before ending any Claude Code session:**
```bash
# 1. Disable API keys
sed -i 's/^OPENAI_API_KEY=/# OPENAI_API_KEY=/' .env.local
sed -i 's/^ANTHROPIC_API_KEY=/# ANTHROPIC_API_KEY=/' .env.local

# 2. Enable mock mode  
sed -i 's/MOCK_LLM_RESPONSES=false/MOCK_LLM_RESPONSES=true/' .env.local

# 3. Kill development servers
pkill -f "npm run dev" || pkill -f "pnpm dev" || pkill -f "next dev"

# 4. Verify no API-consuming processes
ps aux | grep -E "(node|npm|next)" | grep -v grep
```

**Why this matters:**
- Development servers can make unwanted API calls during testing
- Forgotten API keys can consume subscription credits
- Long-running processes may trigger rate limits or usage warnings

## Project Structure

```
app/
├─ (triage)/page.tsx           # Main triage UI
├─ api/triage/route.ts         # Main orchestration endpoint
├─ api/health/route.ts         # Health check
components/triage/             # UI components
lib/
├─ schemas.ts                  # Zod contracts
├─ adapters/                   # Provider interfaces (FHIR, Vector, LLM)
├─ sk/agents/                  # Semantic Kernel agents
data/seed/                     # Synthetic test data
tests/                         # Test suites by type
```

## Environment Configuration

Copy `.env.example` to `.env.local` and configure:
- `APP_MODE`: LOCAL (default) or CLOUD
- `MODEL_PROVIDER`: openai, anthropic, or azure
- API keys for chosen provider
- `VECTOR_DB_PATH`: SQLite database location

### Anthropic Cost Optimization (Haiku + Caching + Batching)

When using Anthropic as your provider, the system is optimized for maximum cost savings with multiple optimization layers:

```bash
MODEL_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_MODEL=claude-3-5-haiku-20241022        # Default: Haiku for cost savings
ANTHROPIC_SONNET_MODEL=claude-3-5-sonnet-20241022 # Fallback: Sonnet for complex tasks
ANTHROPIC_ENABLE_CACHING=true                     # Enable prompt caching
ANTHROPIC_USE_SMART_ROUTING=true                  # Auto-route complex tasks to Sonnet
ENABLE_PROMPT_CACHING=true                        # Global caching toggle
LOG_CACHE_METRICS=true                           # Track cache performance

# Message Batches API (Additional 50% savings)
ANTHROPIC_ENABLE_BATCHING=true                    # Enable batch processing
ANTHROPIC_BATCH_SIZE=100                         # Max requests per batch
ANTHROPIC_BATCH_WAIT_TIME=5000                   # Wait time before processing
ANTHROPIC_BATCH_THRESHOLD=5                      # Min requests to trigger batch
```

**Multi-Layer Cost Savings**:
- **Claude 3.5 Haiku**: ~90% cheaper than Sonnet for most tasks  
- **Smart Routing**: Only uses Sonnet for complex medical reasoning (20% of requests)
- **Prompt Caching**: 90% discount on cached system prompts
- **Message Batches API**: Additional 50% savings on batchable requests (60% of routine cases)
- **Combined Savings**: Up to 97% cost reduction vs all-Sonnet, no optimizations

**Batch Processing Strategy**:
- **Immediate/Urgent**: Direct processing for red-flag cases
- **Routine**: Smart batching for non-urgent triage requests
- **Automatic Priority Detection**: System determines optimal processing mode

## Development Workflow

1. **Start with tests**: Write failing tests for new feature
2. **Implement feature**: Follow existing patterns and adapters
3. **Validate contracts**: Ensure Zod schemas are up to date
4. **Run CI pipeline**: Must pass all checks before PR
5. **Update documentation**: Keep CLAUDE.md and README.md current

## Adapter Pattern Usage

The codebase uses adapter interfaces to support local development and cloud deployment:
- **FHIR**: LocalFhirRepo (in-memory) → HapiFhirRepo (Docker) → AzureFhirRepo
- **Vector Store**: SqliteVectorStore → AzureAISearchStore
- **LLM**: OpenAIProvider ↔ AnthropicProvider → AzureProvider

When adding new features, always implement against the interface to maintain switchability.

### LLM Provider Cost Optimization

The AnthropicProvider includes multiple cost optimization strategies:

**Smart Model Selection**:
- **Haiku (Default)**: SymptomParser, EmpathyCoach, Conductor agents
- **Sonnet (Complex)**: RiskStratifier, CarePathwayPlanner agents  
- **Auto-routing**: Complexity analysis determines model choice

**Advanced Prompt Caching**:
- **System prompts** for all 5 agents are automatically cached
- **Long context** (>500 chars) is cached when beneficial
- **Cache metrics** are logged for cost tracking and optimization

**Intelligent Batch Processing**:
- **Message Batches API**: Up to 10,000 requests per batch with 50% cost savings
- **Smart Priority Routing**: Urgent cases bypass batching for immediate processing
- **Batch Orchestration**: Multi-agent workflows optimized for batch efficiency
- **Automatic Batching**: System determines when to use batch vs direct processing

**Cost Monitoring & Analytics**:
- Real-time cost estimation with batch savings tracking
- Cache hit rate monitoring (target: 80%)
- Batch efficiency metrics and utilization analytics  
- Model usage optimization recommendations

Access cached templates via `CachedPromptTemplates.getCachedSystemPrompt(agentType)`.
Use `BatchTriageOrchestrator` for intelligent batch processing of routine triage requests.

## Security & Compliance Considerations

- All patient data uses synthetic/mock data in development
- PII is redacted in logs using [REDACTED] placeholders
- Request/response validation prevents injection attacks
- Security headers enforced via Next.js middleware
- Content safety filtering on all LLM interactions