# Clinical Cards UI – shadcn/ui + Next.js (Agentic Triage)

A sleek, card‑driven triage UI using **Next.js 14 (App Router)**, **Tailwind**, **shadcn/ui**, **Radix**, and **Lucide**. This plugs into your existing `/api/triage` endpoint and agentic back end. Copy files by path below.

---

## 0) Install & set up

```bash
# If Tailwind isn’t set up (skip if you already have it)
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui
pnpm dlx shadcn-ui@latest init -d
# Add commonly used components
pnpm dlx shadcn-ui@latest add button card badge input textarea select drawer toast separator tabs skeleton switch tooltip dropdown-menu label

# deps
pnpm add lucide-react @tanstack/react-query zod class-variance-authority tailwind-merge
```

**tailwind.config.ts** – ensure content includes the App Router paths and shadcn preset:
```ts
import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
    },
  },
  plugins: [],
};
export default config;
```

**app/globals.css** – include Tailwind base:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 1) Types (contracts)

**lib/types.ts**
```ts
import { z } from "zod";

export const ClinicalEvidence = z.object({
  patientId: z.string(),
  presentingComplaint: z.string(),
  features: z.object({
    onset: z.string().optional(),
    severity: z.number().min(0).max(10).optional(),
    radiation: z.string().optional(),
    associated: z.array(z.string()).optional(),
    vitals: z.object({
      bp: z.string().optional(),
      hr: z.number().optional(),
      spo2: z.number().optional(),
      rr: z.number().optional(),
      temp: z.number().optional(),
    }).partial().optional(),
    redFlags: z.array(z.string()).optional(),
  }),
  codes: z.array(z.object({ system: z.string(), code: z.string(), term: z.string() })).optional(),
  meds: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
});
export type TClinicalEvidence = z.infer<typeof ClinicalEvidence>;

export const RiskAssessment = z.object({
  band: z.enum(["immediate","urgent","routine"]),
  pUrgent: z.number().min(0).max(1),
  explain: z.array(z.string()),
  requiredInvestigations: z.array(z.string()).optional(),
  differentials: z.array(z.string()).optional(),
});
export type TRiskAssessment = z.infer<typeof RiskAssessment>;

export const CarePlan = z.object({
  disposition: z.string(),
  why: z.array(z.string()),
  whatToExpect: z.array(z.string()).optional(),
  safetyNet: z.array(z.string()).optional(),
});
export type TCarePlan = z.infer<typeof CarePlan>;

export const Citation = z.object({ source: z.string(), snippet: z.string() });

export const TriageResponse = z.object({
  evidence: ClinicalEvidence,
  risk: RiskAssessment,
  plan: CarePlan,
  confidence: z.number().min(0).max(1),
  citations: z.array(Citation),
});
export type TTriageResponse = z.infer<typeof TriageResponse>;
```

---

## 2) Query client provider & Toaster

**components/providers.tsx**
```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
```

**app/layout.tsx**
```tsx
import "@/app/globals.css";
import { Providers } from "@/components/providers";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Triage Conductor",
  description: "Clinical cards UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className + " min-h-screen bg-background text-foreground"}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 3) Small UI utilities

**components/ModeToggle.tsx**
```tsx
"use client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type UIMode = "patient" | "clinician";
export function ModeToggle({ mode, onChange }: { mode: UIMode; onChange: (m: UIMode)=>void }) {
  const checked = mode === "clinician";
  return (
    <div className="flex items-center gap-3">
      <Label htmlFor="mode">Patient</Label>
      <Switch id="mode" checked={checked} onCheckedChange={(v)=>onChange(v?"clinician":"patient")} />
      <span className="text-sm text-muted-foreground">Clinician</span>
    </div>
  );
}
```

**components/PatientSelector.tsx**
```tsx
"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; label: string };
export function PatientSelector({ value, onChange, options }:{ value?: string; onChange:(v:string)=>void; options:Option[] }){
  return (
    <div className="min-w-[220px]">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full"><SelectValue placeholder="Select patient" /></SelectTrigger>
        <SelectContent>
          {options.map(o=> (<SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

---

## 4) Triage components (cards)

**components/triage/SymptomInput.tsx**
```tsx
"use client";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { TTriageResponse, TriageResponse } from "@/lib/types";

export function SymptomInput({ patientId, mode, onResult }:{ patientId?:string; mode:"patient"|"clinician"; onResult:(r:TTriageResponse)=>void }){
  const [text, setText] = useState("");
  const { toast } = useToast();

  const m = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error("Select a patient");
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input: { text }, patientId }),
      });
      if (!res.ok) throw new Error("Triage failed");
      const json = await res.json();
      const parsed = TriageResponse.parse(json);
      return parsed;
    },
    onSuccess: (data) => {
      onResult(data);
      // naïve clarifier example: if explain mentions "missing" show toast
      if (data.risk.explain.some(e => /missing|clarify/i.test(e))) {
        toast({ title: "Clarifying question", description: "I need a bit more info. Check the toast details.", duration: 5000 });
      }
    },
    onError: (err:any) => toast({ title: "Couldn't triage", description: err?.message ?? "Try again", variant: "destructive" })
  });

  return (
    <div className="space-y-3">
      <Textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Describe the symptoms…" className="min-h-[140px]" />
      <div className="flex gap-2">
        <Button onClick={()=>m.mutate()} disabled={m.isPending}>Triage</Button>
        <Button variant="secondary" onClick={()=>setText("")} disabled={m.isPending}>Clear</Button>
      </div>
    </div>
  );
}
```

**components/triage/RiskCard.tsx**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRiskAssessment } from "@/lib/types";

const bandColor: Record<TRiskAssessment["band"], string> = {
  immediate: "bg-red-600",
  urgent: "bg-amber-500",
  routine: "bg-emerald-600",
};

export function RiskCard({ risk }:{ risk: TRiskAssessment }){
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">Risk Assessment
          <Badge className={"text-white " + bandColor[risk.band]}>{risk.band.toUpperCase()}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">Probability urgent: <span className="font-medium text-foreground">{Math.round(risk.pUrgent*100)}%</span></div>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {risk.explain.map((e,i)=>(<li key={i}>{e}</li>))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

**components/triage/PlanCard.tsx**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TCarePlan } from "@/lib/types";

export function PlanCard({ plan }:{ plan: TCarePlan }){
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan & Next Steps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-sm text-muted-foreground">Disposition</div>
          <div className="font-medium">{plan.disposition}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Why</div>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {plan.why.map((w,i)=>(<li key={i}>{w}</li>))}
          </ul>
        </div>
        {plan.whatToExpect && (
          <div>
            <div className="text-sm text-muted-foreground">What to expect</div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {plan.whatToExpect.map((w,i)=>(<li key={i}>{w}</li>))}
            </ul>
          </div>
        )}
        {plan.safetyNet && (
          <div>
            <div className="text-sm text-muted-foreground">Safety net</div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {plan.safetyNet.map((w,i)=>(<li key={i}>{w}</li>))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**components/triage/RationaleDrawer.tsx**
```tsx
"use client";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { TTriageResponse } from "@/lib/types";

export function RationaleDrawer({ data }:{ data?: TTriageResponse }){
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">View rationale & citations</Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Audit trail</DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pb-6 space-y-6 overflow-auto">
          <section>
            <h4 className="font-medium mb-2">Citations</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {data?.citations.map((c,i)=>(<li key={i}><span className="font-mono text-xs">{c.source}</span>: {c.snippet}</li>))}
            </ul>
          </section>
          <section>
            <h4 className="font-medium mb-2">Evidence (JSON)</h4>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto">{JSON.stringify(data?.evidence, null, 2)}</pre>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```

**components/triage/Timeline.tsx**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Item = { time: string; text: string };
export function Timeline({ items }:{ items: Item[] }){
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative border-l pl-6">
          {items.map((it, i)=> (
            <li key={i} className="mb-6 ml-4">
              <div className="absolute w-3 h-3 bg-primary rounded-full mt-1.5 -left-1.5 border-white" />
              <time className="mb-1 text-xs text-muted-foreground block">{it.time}</time>
              <p className="text-sm">{it.text}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
```

---

## 5) Page (2‑column layout)

**app/(triage)/page.tsx**
```tsx
"use client";
import { useState } from "react";
import { PatientSelector } from "@/components/PatientSelector";
import { ModeToggle, UIMode } from "@/components/ModeToggle";
import { SymptomInput } from "@/components/triage/SymptomInput";
import { RiskCard } from "@/components/triage/RiskCard";
import { PlanCard } from "@/components/triage/PlanCard";
import { RationaleDrawer } from "@/components/triage/RationaleDrawer";
import { Timeline } from "@/components/triage/Timeline";
import { TTriageResponse } from "@/lib/types";
import { Separator } from "@/components/ui/separator";

const demoPatients = [
  { id: "P001", label: "John Carter" },
  { id: "P002", label: "Aisha Khan" },
  { id: "P003", label: "Maria Lopez" },
];

export default function TriagePage(){
  const [patientId, setPatientId] = useState<string|undefined>(demoPatients[0]?.id);
  const [mode, setMode] = useState<UIMode>("clinician");
  const [data, setData] = useState<TTriageResponse|undefined>();

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      <header className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <PatientSelector value={patientId} onChange={setPatientId} options={demoPatients} />
          <Separator orientation="vertical" className="h-6" />
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
        <RationaleDrawer data={data} />
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left */}
        <div className="space-y-6">
          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold mb-3">Symptom Intake</h3>
            <SymptomInput patientId={patientId} mode={mode} onResult={setData} />
          </div>
          <Timeline items={[
            { time: "Yesterday 14:10", text: "Mild chest discomfort; troponin normal." },
            { time: "Today 08:55", text: "Severe pain; GTN given; ECG pending." },
          ]} />
        </div>

        {/* Right */}
        <div className="space-y-6">
          {data ? (
            <>
              <RiskCard risk={data.risk} />
              <PlanCard plan={data.plan} />
            </>
          ) : (
            <div className="text-sm text-muted-foreground border rounded-2xl p-6">
              Results will appear here after triage.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
```

---

## 6) Toasts wiring

> Your `Toaster` is already injected via `Providers`. To fire toasts, use `useToast()` from `@/components/ui/use-toast` (as shown in `SymptomInput`).

---

## 7) Nice touches (optional)

- Add `Skeleton` placeholders around Risk/Plan while mutation is pending.
- Add a `Tooltip` over the risk badge explaining bands.
- Theme tweaks: set `:root` CSS vars to align with your brand.
- Accessibility: ensure labels for all inputs; tab order in header.

---

## 8) Playwright smoke test (optional)

**tests/e2e/triage.spec.ts**
```ts
import { test, expect } from "@playwright/test";

test("triage page renders", async ({ page }) => {
  await page.goto("/triage");
  await expect(page.getByText("Symptom Intake")).toBeVisible();
  await expect(page.getByText("Timeline")).toBeVisible();
});
```

Run with `pnpm dlx playwright install` then `pnpm playwright test`.

---

## 9) Hooking to your back end

- `/api/triage` should return `TriageResponse` matching the Zod schema.
- If you prefer server actions instead of a route, keep the client API the same shape for minimal churn.

---

## 10) Visual design notes

- Use generous padding, `rounded-2xl`, and soft borders for the clinical feel.
- Keep typography calm and readable; avoid tiny text.
- Keep patient/clinician mode clearly visible in the header.

That’s it — drop these files in and you’ll have the **Clinical Cards** UI running, ready to pair with your agentic orchestration.


---

## 11) Theme palette (brandable, light/dark)

Add these CSS variables to **`app/globals.css`** (below the Tailwind directives). They follow shadcn’s token naming, so all UI picks them up automatically.

```css
/* === Clinical theme tokens === */
:root {
  /* base surfaces */
  --background: 0 0% 100%;
  --foreground: 222.2 47.4% 11.2%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 47.4% 11.2%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 47.4% 11.2%;

  /* brand */
  --primary: 221.2 83.2% 53.3%;           /* clinical blue */
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --accent: 221 100% 60%;
  --accent-foreground: 210 40% 98%;

  /* feedback */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --success: 142 70% 45%;   /* emerald */
  --warning: 38 92% 50%;    /* amber */
  --danger: 0 84% 60%;      /* red */

  /* strokes & focus */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;

  /* radius */
  --radius: 1rem;           /* rounded-2xl vibe */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 6.5%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 6.5%;
  --popover-foreground: 210 40% 98%;

  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --accent: 215 92% 64%;
  --accent-foreground: 222.2 47.4% 11.2%;

  --destructive: 0 63% 50%;
  --destructive-foreground: 210 40% 98%;
  --success: 142 70% 40%;
  --warning: 38 92% 50%;
  --danger: 0 84% 58%;

  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 217.2 91.2% 59.8%;
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

> Tip: to tweak brand color, adjust `--primary` / `--accent` (HSL). All shadcn components update automatically.

---

## 12) Risk badge tooltip (shadcn Tooltip)

Replace **`components/triage/RiskCard.tsx`** with this version to show an accessible tooltip explaining bands.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRiskAssessment } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Activity } from "lucide-react";

const bandColor: Record<TRiskAssessment["band"], string> = {
  immediate: "bg-red-600",
  urgent: "bg-amber-500",
  routine: "bg-emerald-600",
};

const bandCopy: Record<TRiskAssessment["band"], string> = {
  immediate: "Immediate: red flags present. Escalate now.",
  urgent: "Urgent: see same day / rapid assessment.",
  routine: "Routine: manage in primary care / safety-net.",
};

export function RiskCard({ risk }:{ risk: TRiskAssessment }){
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/> Risk Assessment</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className={"text-white cursor-help " + bandColor[risk.band]}>{risk.band.toUpperCase()}</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[240px] text-sm">{bandCopy[risk.band]}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">Probability urgent: <span className="font-medium text-foreground">{Math.round(risk.pUrgent*100)}%</span></div>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {risk.explain.map((e,i)=>(<li key={i}>{e}</li>))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

---

## 13) Skeleton loaders (pending state)

Add skeleton components and wire them to the page so the right column feels responsive during triage.

**`components/triage/RiskCardSkeleton.tsx`**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RiskCardSkeleton(){
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-4 w-64" />
      </CardContent>
    </Card>
  );
}
```

**`components/triage/PlanCardSkeleton.tsx`**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PlanCardSkeleton(){
  return (
    <Card>
      <CardHeader>
        <CardTitle><Skeleton className="h-5 w-48" /></CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-4 w-56" />
      </CardContent>
    </Card>
  );
}
```

**(optional) `components/triage/TimelineSkeleton.tsx`**
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TimelineSkeleton(){
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(3)].map((_,i)=> (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-3 w-3 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

### Wire loading state
Update **`components/triage/SymptomInput.tsx`** to notify the parent when loading starts/ends.

```tsx
// add to props
export function SymptomInput({ patientId, mode, onResult, onLoadingChange }:{ patientId?:string; mode:"patient"|"clinician"; onResult:(r:TTriageResponse)=>void; onLoadingChange?:(b:boolean)=>void }){
  // ...
  const m = useMutation({
    mutationFn: async () => { /* same as before */ },
    onMutate: () => onLoadingChange?.(true),
    onSuccess: (data) => { onResult(data); },
    onError: () => {},
    onSettled: () => onLoadingChange?.(false),
  });
  // ...
}
```

Then update **`app/(triage)/page.tsx`** to render skeletons while loading:

```tsx
import { RiskCardSkeleton } from "@/components/triage/RiskCardSkeleton";
import { PlanCardSkeleton } from "@/components/triage/PlanCardSkeleton";
// import { TimelineSkeleton } from "@/components/triage/TimelineSkeleton";

export default function TriagePage(){
  const [loading, setLoading] = useState(false);
  // ... existing state

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* header same as before */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold mb-3">Symptom Intake</h3>
            <SymptomInput patientId={patientId} mode={mode} onResult={setData} onLoadingChange={setLoading} />
          </div>
          {/* {loading ? <TimelineSkeleton/> : <Timeline items={[...]} />} */}
          <Timeline items={[
            { time: "Yesterday 14:10", text: "Mild chest discomfort; troponin normal." },
            { time: "Today 08:55", text: "Severe pain; GTN given; ECG pending." },
          ]} />
        </div>
        <div className="space-y-6">
          {loading ? (
            <>
              <RiskCardSkeleton />
              <PlanCardSkeleton />
            </>
          ) : data ? (
            <>
              <RiskCard risk={data.risk} />
              <PlanCard plan={data.plan} />
            </>
          ) : (
            <div className="text-sm text-muted-foreground border rounded-2xl p-6">Results will appear here after triage.</div>
          )}
        </div>
      </section>
    </main>
  );
}
```

---

## 14) Optional: Dark mode toggle

If you want a quick dark‑mode switch for demos, add this tiny client component and place it in the header.

**`components/DarkModeButton.tsx`**
```tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function DarkModeButton(){
  const [dark, setDark] = useState(false);
  useEffect(()=>{
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <Button variant="ghost" size="icon" onClick={()=>setDark(v=>!v)} aria-label="Toggle dark mode">
      {dark ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
    </Button>
  );
}
```

Add it to the header:
```tsx
import { DarkModeButton } from "@/components/DarkModeButton";
// inside header JSX, right side:
<DarkModeButton />
```

These changes give you: brandable theme tokens, a helpful risk tooltip, and smooth skeletons while triage runs—keeping the **Clinical Cards** experience premium and responsive.

