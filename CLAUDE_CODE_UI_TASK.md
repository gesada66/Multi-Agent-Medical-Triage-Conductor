Objective

Implement the Clinical Cards UI (Next.js 14 + Tailwind + shadcn/ui + Radix + Lucide) that connects to my existing /api/triage. Deliver a clean, modern, card-driven triage interface.

Stack & Constraints

Next.js App Router, TypeScript, Tailwind, shadcn/ui, Radix, Lucide, React Query, Zod.

Accessibility first (labels, focus, keyboard).

Minimal bundle; no heavy UI lib beyond shadcn/ui.

Layout (high level)

Header: PatientSelector + ModeToggle (Patient/Clinician) + RationaleDrawer trigger (+ optional DarkMode button)

2-column grid:

Left: SymptomInput (wizard panel) → Timeline rail

Right: RiskCard, PlanCard, (RationaleDrawer shows citations/evidence)

Components to create

components/PatientSelector.tsx

components/ModeToggle.tsx

components/triage/SymptomInput.tsx

components/triage/RiskCard.tsx (+ tooltip)

components/triage/PlanCard.tsx

components/triage/RationaleDrawer.tsx

components/triage/Timeline.tsx

Skeletons: RiskCardSkeleton.tsx, PlanCardSkeleton.tsx (optional TimelineSkeleton.tsx)

Optional: components/DarkModeButton.tsx

Zod contracts in lib/types.ts

Page: app/(triage)/page.tsx

Theme tokens in app/globals.css (CSS variables for light/dark)

API contract

POST /api/triage → returns TriageResponse (Zod schema in lib/types.ts)

UI must validate responses and render cards accordingly.

Acceptance tests (must pass before finishing)

Functional

Selecting a patient and submitting symptoms calls /api/triage and renders RiskCard and PlanCard.

Tooltip on risk badge explains band meaning.

Rationale drawer lists citations and shows evidence JSON.

Skeletons appear while request is in-flight.

Non-functional

Axe accessibility: no critical violations on /triage.

Lighthouse (or equivalent): CLS < 0.1, TTI reasonable for SSR.

Type-safe: no TypeScript errors; Zod guards all API I/O.

Lint clean.

ASCII wireframe (for exact layout)
+====================================================================================================+
|  PATIENT: [▼ John Carter]   |  Mode: [ Patient ☐ ] [ ☑ Clinician ]   |  [ View Rationale ▾ ]  [☀] |
+====================================================================================================+

+-----------------------------------------------+  +-----------------------------------------------+
| [ CARD ] Symptom Intake                       |  | [ CARD ] Risk Assessment                      |
|-----------------------------------------------|  |-----------------------------------------------|
|  Describe the symptoms... (textarea)          |  |  BAND: [ IMMEDIATE ]   p(urgent): 92%         |
|  [ Triage ]   [ Clear ]                       |  |  • severe chest pain > 15m                    |
+-----------------------------------------------+  |  • abnormal vitals (BP 160/100)               |
                                                    |  • diaphoresis, nausea                        |
                                                    +-----------------------------------------------+

+-----------------------------------------------+  +-----------------------------------------------+
| [ CARD ] Timeline                             |  | [ CARD ] Plan & Next Steps                    |
|-----------------------------------------------|  |-----------------------------------------------|
|  • Yesterday 14:10 | mild pain; trop normal   |  | Disposition: Go to Emergency Dept now         |
|  • Today 08:55     | severe pain; GTN; ECG    |  | Why: severe pain; abnormal BP + symptoms      |
+-----------------------------------------------+  | What to expect: ECG, serial troponin          |
                                                   | Safety-net: call 999 if syncope/worsening     |
                                                   +-----------------------------------------------+

Theming

Add shadcn-style CSS variables to app/globals.css for brand colors (primary/accent), borders, and rounded radius (--radius: 1rem). Provide light/dark tokens.

Implementation checklist

 Install shadcn/ui and required components.

 Implement components & page exactly per file list above.

 Wire loading → show skeletons; success → render cards; errors → toast.

 Add tooltip to risk badge; add optional DarkMode button.

 Validate API responses with Zod; no unsafe casts.

 Add a Playwright smoke test: /triage renders and can submit.

 Add pnpm ci script to run lint, typecheck, tests.

Deliverables

All source files created/updated.

A short README section with “How to run UI locally” and “How to point to real /api/triage”.

Passing test artifacts (or steps to run them).