'use client';

import * as React from "react";
import { useState } from "react";

// ClinicalCardsUI - Full-featured professional medical triage interface
// FEATURES: shadcn/ui components, React Query, toast notifications, rationale drawer
// COMPONENTS: PatientSelector, ModeToggle, SymptomInput, RiskCard, PlanCard, Timeline
// CURRENT: This is the recommended component for production use
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Sun } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { RationaleDrawer } from "@/components/RationaleDrawer";

// Types
export type UIMode = "patient" | "clinician";
type Option = { id: string; label: string };

// Patient Selector Component
function PatientSelector({ 
  value, 
  onChange, 
  options 
}: { 
  value?: string; 
  onChange: (v: string) => void; 
  options: Option[] 
}) {
  return (
    <div className="min-w-[220px]">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select patient" />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Mode Toggle Component
function ModeToggle({ mode, onChange }: { mode: UIMode; onChange: (m: UIMode) => void }) {
  const checked = mode === "clinician";
  return (
    <div className="flex items-center gap-3">
      <Label htmlFor="mode" className="text-sm">Patient</Label>
      <Switch 
        id="mode" 
        checked={checked} 
        onCheckedChange={(v) => onChange(v ? "clinician" : "patient")} 
      />
      <span className="text-sm text-muted-foreground">Clinician</span>
    </div>
  );
}

// Symptom Input Component
function SymptomInput({ 
  patientId, 
  mode, 
  onResult 
}: { 
  patientId?: string; 
  mode: UIMode; 
  onResult: (r: any) => void 
}) {
  const [text, setText] = useState("");
  const { toast } = useToast();

  const m = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error("Select a patient");
      // REAL API MODE: Test dynamic badge determination with ConductorAgent
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          input: { text },
          patientId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      return await response.json();
      
    },
    onSuccess: (data) => {
      onResult(data);
      toast({ 
        title: "Triage complete", 
        description: `Risk assessment: ${data.risk.band.toUpperCase()}`,
        duration: 3000 
      });
    },
    onError: (err: any) => toast({ 
      title: "Triage failed", 
      description: err?.message ?? "Try again", 
      variant: "destructive" 
    })
  });

  return (
    <div className="space-y-3">
      <Textarea 
        value={text} 
        onChange={e => setText(e.target.value)} 
        placeholder="Describe the symptoms…" 
        className="min-h-[140px] resize-none" 
      />
      <div className="flex gap-2">
        <Button onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending ? "Processing..." : "Triage"}
        </Button>
        <Button variant="secondary" onClick={() => setText("")} disabled={m.isPending}>
          Clear
        </Button>
      </div>
    </div>
  );
}

// Risk Card Component
const bandColor: Record<string, string> = {
  immediate: "bg-red-600",
  urgent: "bg-amber-500",
  routine: "bg-emerald-600",
};

const priorityColor: Record<string, string> = {
  immediate: "bg-red-600/80",
  urgent: "bg-amber-500/80",
  routine: "bg-emerald-600/80",
  batch: "bg-indigo-600/80",
};

const bandCopy: Record<string, string> = {
  immediate: "Immediate: red flags present. Escalate now.",
  urgent: "Urgent: see same day / rapid assessment.",
  routine: "Routine: manage in primary care / safety-net.",
};

function RiskCard({ risk, routing }: { risk: any; routing?: any }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary"/> 
            Risk Assessment
          </span>
          <div className="flex items-center gap-2">
            <Badge className={"text-white " + bandColor[risk.band]}>{risk.band.toUpperCase()}</Badge>
            {routing?.priority && (
              <Badge className={"text-white " + priorityColor[routing.priority]}>
                PRIORITY: {routing.priority.toUpperCase()}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Probability urgent: <span className="font-medium text-foreground">
            {Math.round(risk.pUrgent * 100)}%
          </span>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {risk.explain.map((e: string, i: number) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
        {process.env.NODE_ENV !== "production" && routing?.testCategory && (
          <div className="text-xs text-muted-foreground">Test tag: <span className="font-mono">{routing.testCategory}</span></div>
        )}
      </CardContent>
    </Card>
  );
}

// Plan Card Component
function PlanCard({ plan }: { plan: any }) {
  return (
    <Card className="h-full">
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
            {plan.why.map((w: string, i: number) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
        {plan.whatToExpect && (
          <div>
            <div className="text-sm text-muted-foreground">What to expect</div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {plan.whatToExpect.map((w: string, i: number) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {plan.safetyNet && (
          <div>
            <div className="text-sm text-muted-foreground">Safety net</div>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {plan.safetyNet.map((w: string, i: number) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Timeline Component
type TimelineItem = { time: string; text: string };
function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
            No medical history available
          </div>
        ) : (
          <ol className="relative border-l pl-6">
            {items.map((it, i) => (
              <li key={i} className="mb-6 ml-4">
                <div className="absolute w-3 h-3 bg-primary rounded-full mt-1.5 -left-1.5 border-white" />
                <time className="mb-1 text-xs text-muted-foreground block">{it.time}</time>
                <p className="text-sm">{it.text}</p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// Main Clinical Cards UI
export default function ClinicalCardsUI() {
  const [patientId, setPatientId] = useState<string | undefined>("P001");
  const [mode, setMode] = useState<UIMode>("clinician");
  const [data, setData] = useState<any | undefined>();
  const [rationaleOpen, setRationaleOpen] = useState(false);

  const demoPatients = [
    { id: "P001", label: "John Carter, 45y, Male" },
    { id: "P002", label: "Sarah Wilson, 32y, Female" },
    { id: "P003", label: "Michael Chen, 67y, Male" },
    { id: "UNREG", label: "Unregistered Patient" },
  ];

  // Dynamic timeline based on selected patient
  const getTimelineForPatient = (patientId?: string) => {
    switch (patientId) {
      case "P001": // John Carter, 45y, Male
        return [
          { time: "Yesterday 14:10", text: "Mild chest discomfort; troponin normal." },
          { time: "Today 08:55", text: "Severe pain; GTN given; ECG pending." },
        ];
      case "P002": // Sarah Wilson, 32y, Female
        return [
          { time: "3 days ago", text: "Headaches started; stress at work." },
          { time: "Yesterday", text: "Pain worsening; affecting sleep quality." },
          { time: "Today 09:30", text: "Nausea and photophobia reported." },
        ];
      case "P003": // Michael Chen, 67y, Male
        return [
          { time: "Last week", text: "Ankle twisted during morning walk." },
          { time: "3 days ago", text: "Swelling reduced; mobility improving." },
          { time: "Today", text: "Still some discomfort when weight bearing." },
        ];
      case "UNREG": // Unregistered Patient
        return []; // Empty timeline for unregistered patients
      default:
        return [];
    }
  };

  const timelineItems = getTimelineForPatient(patientId);

  // Dynamic rationale based on patient and triage results
  const getDynamicRationale = (patientId?: string, triageData?: any) => {
    // If we have actual triage data, use it; otherwise provide patient-specific defaults
    if (triageData?.rationale) {
      return triageData.rationale;
    }

    // Generate default rationale based on patient's medical history
    switch (patientId) {
      case "P001": // John Carter - Cardiac case
        return {
          summary: "This patient presents with severe chest pain lasting over 30 minutes, accompanied by diaphoresis and nausea. The combination of symptoms, abnormal vital signs, and clinical presentation suggests acute coronary syndrome requiring immediate evaluation.",
          reasoning: [
            "Chest pain duration >15 minutes raises concern for ACS",
            "Associated autonomic symptoms (diaphoresis, nausea) support cardiac etiology", 
            "Abnormal blood pressure indicates hemodynamic compromise",
            "Previous troponin normal but clinical deterioration noted"
          ],
          evidence: [
            "Severe chest pain >30min - High risk feature for STEMI/NSTEMI",
            "Diaphoresis + nausea - Autonomic response typical of cardiac ischemia", 
            "Abnormal BP - Suggests cardiac compromise or cardiogenic shock risk",
            "Timeline shows progression from mild to severe symptoms"
          ],
          citations: [
            { title: "2020 ESC Guidelines for ACS", url: "https://academic.oup.com/eurheartj/article/42/14/1289/6274647" },
            { title: "AHA/ACC Chest Pain Guidelines", url: "https://www.ahajournals.org/doi/10.1161/CIR.0000000000001030" }
          ],
          confidence: 0.92,
          modelUsed: "GPT-4",
          timestamp: new Date().toISOString()
        };
        
      case "P002": // Sarah Wilson - Headache case
        return {
          summary: "This patient presents with progressive headaches over 3 days, now accompanied by nausea and photophobia. The symptom progression and associated features suggest possible migraine or tension headache with secondary features requiring clinical evaluation.",
          reasoning: [
            "Progressive headache over 3 days indicates worsening condition",
            "Nausea and photophobia are concerning secondary symptoms",
            "Work-related stress may be contributing factor",
            "Sleep disturbance suggests significant impact on daily functioning"
          ],
          evidence: [
            "3-day progression - Suggests evolving neurological condition",
            "Photophobia - Classic sign of migraine or meningeal irritation",
            "Sleep disruption - Indicates moderate to severe headache impact",
            "Work stress correlation - Common trigger for tension headaches"
          ],
          citations: [
            { title: "NICE Headache Guidelines", url: "https://www.nice.org.uk/guidance/cg150" },
            { title: "International Headache Society Classification", url: "https://ichd-3.org/" }
          ],
          confidence: 0.75,
          modelUsed: "GPT-4",
          timestamp: new Date().toISOString()
        };
        
      case "P003": // Michael Chen - Ankle injury case
        return {
          summary: "This patient presents with a week-old ankle injury from a fall during walking. Despite initial improvement, ongoing discomfort with weight bearing suggests possible ligament strain or minor fracture requiring assessment.",
          reasoning: [
            "Mechanism of injury (fall during walk) suggests moderate force trauma",
            "Initial improvement followed by persistent symptoms is concerning",
            "Weight-bearing difficulty indicates structural involvement",
            "One week duration suggests healing complications"
          ],
          evidence: [
            "Fall mechanism - Sufficient force for ligamentous injury",
            "Persistent weight-bearing pain - Suggests ongoing structural damage",
            "Swelling pattern - Initially improved but symptoms persist",
            "Timeline progression - Slower healing than expected for simple sprain"
          ],
          citations: [
            { title: "NICE Fracture Guidelines", url: "https://www.nice.org.uk/guidance/ng38" },
            { title: "Ottawa Ankle Rules", url: "https://www.mdcalc.com/ottawa-ankle-rule" }
          ],
          confidence: 0.68,
          modelUsed: "GPT-4",
          timestamp: new Date().toISOString()
        };
        
      case "UNREG": // Unregistered Patient
        return {
          summary: "This unregistered patient requires comprehensive clinical assessment as no previous medical history is available. Initial triage focuses on symptom severity and immediate risk stratification.",
          reasoning: [
            "No medical history available for risk stratification context",
            "Clinical assessment must rely solely on presenting symptoms",
            "Safety-first approach required due to unknown background",
            "Comprehensive history taking essential for proper evaluation"
          ],
          evidence: [
            "Unknown medical history - Limits risk assessment accuracy",
            "No baseline comparison - Symptoms must be evaluated independently",
            "Medication history unknown - Potential drug interactions unclear",
            "Previous treatments unknown - May affect current presentation"
          ],
          citations: [
            { title: "Emergency Medicine Assessment Guidelines", url: "https://www.rcpch.ac.uk/resources/emergency-care" },
            { title: "Triage Without History Protocol", url: "https://www.emergency-medicine.org/" }
          ],
          confidence: 0.45,
          modelUsed: "GPT-4",
          timestamp: new Date().toISOString()
        };
        
      default:
        return {
          summary: "Clinical assessment pending - please select a patient and complete triage evaluation.",
          reasoning: ["Patient selection required for contextual assessment"],
          evidence: ["No patient data available for clinical reasoning"],
          citations: [],
          confidence: 0.0,
          modelUsed: "GPT-4",
          timestamp: new Date().toISOString()
        };
    }
  };

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-4 justify-between bg-card border rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <PatientSelector value={patientId} onChange={setPatientId} options={demoPatients} />
          <Separator orientation="vertical" className="h-6" />
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
        <div className="flex items-center gap-2">
          {/* View Rationale Button - Opens drawer with clinical reasoning */}
          {/* IMPLEMENTATION: Uses rationaleOpen state + RationaleDrawer component */}
          <Button variant="outline" onClick={() => setRationaleOpen(true)}>
            View rationale & citations
          </Button>
          <Button variant="ghost" size="icon">
            <Sun className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Symptom Intake</CardTitle>
            </CardHeader>
            <CardContent>
              <SymptomInput patientId={patientId} mode={mode} onResult={setData} />
            </CardContent>
          </Card>
          <Timeline items={timelineItems} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {data ? (
            <>
              <RiskCard risk={data.risk} routing={data.routing} />
              <PlanCard plan={data.plan} />
            </>
          ) : (
            <div className="text-sm text-muted-foreground border rounded-2xl p-6 h-full flex items-center justify-center">
              Results will appear here after triage.
            </div>
          )}
        </div>
      </section>
      
      {/* Rationale Drawer */}
      {/* GOTCHA: Mock rationale data structure MUST match RationaleDrawer expectations */}
      {/* - evidence: string[] not object[] to avoid React render errors */}
      {/* - reasoning: string[] for step-by-step display */}
      {/* - citations: object[] with title/url for links */}
      <RationaleDrawer 
        open={rationaleOpen}
        onOpenChange={setRationaleOpen}
        rationale={getDynamicRationale(patientId, data)}
      />
    </main>
  );
}