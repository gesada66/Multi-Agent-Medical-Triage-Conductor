import ClinicalCardsUI from '@/components/ClinicalCardsUI';

// Main HomePage - Medical Triage Interface
// COMPONENT CHOICE: ClinicalCardsUI (full-featured with toasts, rationale drawer)
// ALTERNATIVE: SimpleCardsUI (basic Tailwind-only fallback)
export default function HomePage() {
  return <ClinicalCardsUI />;
}