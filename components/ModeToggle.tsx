"use client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type UIMode = "patient" | "clinician";

export function ModeToggle({ mode, onChange }: { mode: UIMode; onChange: (m: UIMode) => void }) {
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