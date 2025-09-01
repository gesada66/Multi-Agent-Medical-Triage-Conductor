TL;DR

Keep three separate axes: clinical band, operational priority, and QA testCategory.

Compute priority centrally (Conductor) from band + context flags.

Add routing to your API schema so UI and tests can rely on it.

Show both Risk and Priority in the UI; optionally show Test tag in demo/dev.

routing_taxonomy.patch
*** a/lib/schemas.ts
--- b/lib/schemas.ts
@@
-import { z } from "zod";
+import { z } from "zod";

+// --- NEW: taxonomy enums
+export const RiskBand = z.enum(["immediate","urgent","routine"]);
+export const OpsPriority = z.enum(["immediate","urgent","routine","batch"]);
+export const TestCategory = z.enum(["emergency","urgent","routine","edge-case"]);
+
 // (keep your existing evidence schema, etc.)

-export const RiskAssessment = z.object({
-  band: z.enum(["immediate","urgent","routine"]),
+export const RiskAssessment = z.object({
+  band: RiskBand,
   pUrgent: z.number().min(0).max(1),
   explain: z.array(z.string()),
   requiredInvestigations: z.array(z.string()).optional(),
   differentials: z.array(z.string()).optional(),
 });
 export type TRiskAssessment = z.infer<typeof RiskAssessment>;
 
+// --- NEW: routing metadata (derived)
+export const RoutingMeta = z.object({
+  priority: OpsPriority,
+  testCategory: TestCategory.optional(),
+});
+export type TRoutingMeta = z.infer<typeof RoutingMeta>;
+
 export const CarePlan = z.object({
   disposition: z.string(),
   why: z.array(z.string()),
   whatToExpect: z.array(z.string()).optional(),
   safetyNet: z.array(z.string()).optional(),
 });
 export type TCarePlan = z.infer<typeof CarePlan>;
 
 export const TriageResponse = z.object({
   evidence: /* ... keep your existing evidence schema ... */ z.any(),
   risk: RiskAssessment,
   plan: CarePlan,
   confidence: z.number().min(0).max(1),
   citations: z.array(z.object({ source: z.string(), snippet: z.string() })),
+  routing: RoutingMeta, // <-- NEW
 });
 export type TTriageResponse = z.infer<typeof TriageResponse>;

*** /dev/null
--- b/lib/taxonomy.ts
@@
+export type RiskBand = "immediate" | "urgent" | "routine";
+export type OpsPriority = "immediate" | "urgent" | "routine" | "batch";
+export type TestCategory = "emergency" | "urgent" | "routine" | "edge-case";
+
+export const DEFAULT_PRIORITY_BY_RISK: Record<RiskBand, OpsPriority> = {
+  immediate: "immediate",
+  urgent: "urgent",
+  routine: "routine",
+};
+
+export type PriorityOverrideInput = {
+  isAfterHours?: boolean;
+  systemLoad?: "normal" | "high";
+};
+
+export function computePriority(
+  band: RiskBand,
+  o: PriorityOverrideInput = {}
+): OpsPriority {
+  if (band === "routine" && o.isAfterHours) return "batch";
+  if (band === "urgent" && o.systemLoad === "high") return "immediate";
+  return DEFAULT_PRIORITY_BY_RISK[band];
+}
+
+export const SUGGESTED_RISK_BY_TEST: Record<TestCategory, RiskBand> = {
+  emergency: "immediate",
+  urgent: "urgent",
+  routine: "routine",
+  "edge-case": "routine",
+};

*** /dev/null
--- b/lib/normalizers.ts
@@
+import type { TestCategory, RiskBand, OpsPriority } from "./taxonomy";
+import { computePriority, SUGGESTED_RISK_BY_TEST } from "./taxonomy";
+
+export function deriveRouting(
+  band: RiskBand,
+  extras?: { testCategory?: TestCategory; isAfterHours?: boolean; systemLoad?: "normal"|"high" }
+): { priority: OpsPriority; testCategory?: TestCategory } {
+  const priority = computePriority(band, {
+    isAfterHours: extras?.isAfterHours,
+    systemLoad: extras?.systemLoad,
+  });
+  return extras?.testCategory ? { priority, testCategory: extras.testCategory } : { priority };
+}
+
+export function assertConsistent(band: RiskBand, testCategory?: TestCategory) {
+  if (!testCategory) return;
+  const suggested = SUGGESTED_RISK_BY_TEST[testCategory];
+  if (process.env.NODE_ENV !== "production" && suggested === "immediate" && band !== "immediate") {
+    // warn only in dev; allows negative tests
+    console.warn(`[taxonomy] Test tag '${testCategory}' usually implies 'immediate' risk; got '${band}'.`);
+  }
+}

*** a/components/triage/RiskCard.tsx
--- b/components/triage/RiskCard.tsx
@@
-import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
-import { Badge } from "@/components/ui/badge";
-import { TRiskAssessment } from "@/lib/types";
+import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
+import { Badge } from "@/components/ui/badge";
+import type { TRiskAssessment, TRoutingMeta } from "@/lib/schemas";
 
-const bandColor: Record<TRiskAssessment["band"], string> = {
+const bandColor: Record<TRiskAssessment["band"], string> = {
   immediate: "bg-red-600",
   urgent: "bg-amber-500",
   routine: "bg-emerald-600",
 };
 
-export function RiskCard({ risk }:{ risk: TRiskAssessment }){
+const priorityColor: Record<Exclude<TRoutingMeta["priority"], never>, string> = {
+  immediate: "bg-red-600/80",
+  urgent: "bg-amber-500/80",
+  routine: "bg-emerald-600/80",
+  batch: "bg-indigo-600/80",
+};
+
+export function RiskCard({ risk, routing }:{ risk: TRiskAssessment; routing?: TRoutingMeta }){
   return (
     <Card className="h-full">
       <CardHeader>
-        <CardTitle className="flex items-center justify-between">Risk Assessment
-          <Badge className={"text-white " + bandColor[risk.band]}>{risk.band.toUpperCase()}</Badge>
-        </CardTitle>
+        <CardTitle className="flex items-center justify-between gap-2">
+          <span>Risk Assessment</span>
+          <div className="flex items-center gap-2">
+            <Badge className={"text-white " + bandColor[risk.band]}>{risk.band.toUpperCase()}</Badge>
+            {routing?.priority && (
+              <Badge className={"text-white " + priorityColor[routing.priority]}>
+                PRIORITY: {routing.priority.toUpperCase()}
+              </Badge>
+            )}
+          </div>
+        </CardTitle>
       </CardHeader>
       <CardContent className="space-y-3">
         <div className="text-sm text-muted-foreground">Probability urgent: <span className="font-medium text-foreground">{Math.round(risk.pUrgent*100)}%</span></div>
         <ul className="list-disc pl-5 space-y-1 text-sm">
           {risk.explain.map((e,i)=>(<li key={i}>{e}</li>))}
         </ul>
+        {process.env.NODE_ENV !== "production" && routing?.testCategory && (
+          <div className="text-xs text-muted-foreground">Test tag: <span className="font-mono">{routing.testCategory}</span></div>
+        )}
       </CardContent>
     </Card>
   );
 }

*** a/app/(triage)/page.tsx
--- b/app/(triage)/page.tsx
@@
-          {data ? (
+          {data ? (
             <>
-              <RiskCard risk={data.risk} />
+              <RiskCard risk={data.risk} routing={data.routing} />
               <PlanCard plan={data.plan} />
             </>
           ) : (
             <div className="text-sm text-muted-foreground border rounded-2xl p-6">
               Results will appear here after triage.
             </div>
           )}

*** /dev/null
--- b/tests/unit/taxonomy.spec.ts
@@
+import { describe, it, expect } from "vitest";
+import { computePriority } from "@/lib/taxonomy";
+
+describe("taxonomy priority mapping", () => {
+  it("immediate → immediate", () => {
+    expect(computePriority("immediate")).toBe("immediate");
+  });
+  it("urgent → immediate under high load", () => {
+    expect(computePriority("urgent", { systemLoad: "high" })).toBe("immediate");
+  });
+  it("routine → batch after hours", () => {
+    expect(computePriority("routine", { isAfterHours: true })).toBe("batch");
+  });
+});

After applying

Update your Conductor (where you currently return the triage result) to add routing:

import { deriveRouting, assertConsistent } from "@/lib/normalizers";

// ...
const risk = await riskAgent.assess(evidence);
assertConsistent(risk.band, req.testCategory);
const routing = deriveRouting(risk.band, {
  testCategory: req.testCategory,
  // optionally:
  // isAfterHours: clock.isAfterHours(),
  // systemLoad: metrics.load(),
});
return { evidence, risk, plan, confidence, citations, routing };


Run tests:

pnpm vitest run


That’s it—your taxonomy is unified, the UI shows both clinical risk and ops priority, and the tests lock the mapping in place. If you want, I can also add a small selector in Demo Mode to tag cases with testCategory so it shows up as the tiny label under Risk.