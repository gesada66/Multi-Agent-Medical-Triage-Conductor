#!/bin/bash
# Switch to unlimited Anthropic Sonnet/Haiku configuration
# Usage: ./scripts/switch-to-unlimited.sh

echo "🚀 Switching to Unlimited Anthropic Configuration..."

# Backup existing .env.local if it exists
if [ -f .env.local ]; then
    cp .env.local .env.local.backup
    echo "📋 Backed up existing .env.local to .env.local.backup"
fi

# Copy unlimited configuration
cp .env.unlimited .env.local
echo "✅ Copied unlimited configuration to .env.local"

echo "📝 Please update your ANTHROPIC_API_KEY in .env.local"
echo ""
echo "🎯 Configuration Summary:"
echo "  • PRIMARY: Claude 3.5 Haiku (95% of tasks)"
echo "  • SECONDARY: Claude 3.5 Sonnet (complex reasoning only)"
echo "  • Smart routing threshold: 4+ (more conservative)"
echo "  • Agent-specific routing: Enabled"
echo "  • Prompt caching: Enabled"
echo "  • Batch processing: Enabled"
echo ""
echo "🏁 Ready to use unlimited Sonnet/Haiku!"
echo "   Run: npm run dev"