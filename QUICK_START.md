# 🚀 Quick Start Guide

Get the Multi-Agent Medical Triage Conductor running locally in 5 minutes!

## 📋 Prerequisites

- Node.js 18+ and npm/pnpm
- OpenAI API key OR Anthropic API key (or both)

## ⚡ Quick Setup

### 1. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 2. Configure Environment
```bash
# Copy the environment template
cp .env.example .env.local

# Edit .env.local and add your API keys:
# For Anthropic (recommended for cost savings):
MODEL_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here

# For OpenAI:
# MODEL_PROVIDER=openai  
# OPENAI_API_KEY=sk-your-key-here
```

### 3. Test the Demo (Without Starting Server)
```bash
# Run demo with Anthropic (recommended)
npm run demo:anthropic

# Run demo with OpenAI
npm run demo:openai

# Run specific scenarios
npm run demo:chest-pain
npm run demo:headache

# Compare both providers
npm run demo:compare
```

### 4. Start the API Server
```bash
# Start development server
npm run dev

# Server runs on http://localhost:3000
```

### 5. Test API Endpoints
```bash
# Health check
npm run health

# Test single triage request
npm run api:test-triage

# Test batch processing
npm run api:test-batch
```

## 🎯 Demo Scenarios

The demo includes 4 medical scenarios:

1. **Chest Pain Emergency** - Heart attack presentation (immediate risk)
2. **Severe Headache** - Neurological symptoms (urgent risk)  
3. **Minor Headache** - Routine care (routine risk)
4. **Shortness of Breath** - Respiratory symptoms (urgent risk)

## 🔌 API Endpoints

### Single Triage
```bash
POST /api/triage
{
  "mode": "patient",
  "input": {
    "text": "chest pain for 20 minutes, sweating"
  },
  "patientId": "demo-001",
  "patientContext": {
    "age": 58,
    "gender": "male"
  }
}
```

### Batch Triage
```bash
POST /api/triage/batch
{
  "requests": [
    {
      "mode": "patient", 
      "input": {"text": "headache"},
      "patientId": "batch-001"
    },
    {
      "mode": "clinician",
      "input": {"text": "chest pain with diaphoresis"},
      "patientId": "batch-002"
    }
  ],
  "priority": "batch"
}
```

### Health Check
```bash
GET /api/health
```

## 💰 Cost Optimization

### Anthropic (Recommended)
- **Model**: Claude 3.5 Haiku ($0.25/$1.25 per 1M tokens)
- **Prompt Caching**: 90% discount on system prompts
- **Batch Processing**: 50% additional savings
- **Smart Routing**: Uses Sonnet only for complex reasoning
- **Total Savings**: Up to 97% vs baseline

### OpenAI
- **Model**: GPT-4o-mini ($0.50/$1.50 per 1M tokens)
- **Standard pricing**, no additional optimizations

## 🧪 Testing

```bash
# Type checking
npm run typecheck

# Linting  
npm run lint

# All tests
npm run ci

# Individual test types
npm run test              # Unit tests
npm run test:agents       # Agent-specific tests
npm run e2e               # End-to-end tests
npm run perf              # Performance tests
```

## 🔍 Monitoring

```bash
# Basic health check
curl http://localhost:3000/api/health

# Full system test
curl -X POST http://localhost:3000/api/health \
  -H 'Content-Type: application/json' \
  -d '{"testType": "full"}'

# Get service info
curl http://localhost:3000/api/triage
```

## 🚨 Troubleshooting

### API Key Issues
```bash
# Verify your API keys work
npm run demo:anthropic  # Test Anthropic
npm run demo:openai     # Test OpenAI
```

### Provider Switching
```bash
# Switch provider in .env.local
MODEL_PROVIDER=anthropic  # or openai

# Test the switch
npm run health
```

### Common Errors

**"API key required"**
- Add your API key to `.env.local`
- Ensure the key starts with `sk-ant-` (Anthropic) or `sk-` (OpenAI)

**"Model provider not found"** 
- Check `MODEL_PROVIDER` in `.env.local`
- Valid values: `anthropic`, `openai`

**Demo fails**
- Ensure dependencies are installed: `npm install`
- Check API key is correct and has credits
- Try switching providers: change `MODEL_PROVIDER` in `.env.local`

## 🎉 Success!

If everything works, you should see:
- ✅ Demo scenarios run successfully
- ✅ API endpoints respond
- ✅ Health checks pass
- 💰 Cost optimizations active (97% savings with Anthropic)

## 📖 Next Steps

- Read [CLAUDE.md](./CLAUDE.md) for development guidelines
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [TESTING.md](./TESTING.md) for testing strategies
- Review [README.md](./README.md) for full documentation