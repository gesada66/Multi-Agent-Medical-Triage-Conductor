export type RiskBand = "immediate" | "urgent" | "routine";
export type OpsPriority = "immediate" | "urgent" | "routine" | "batch";
export type TestCategory = "emergency" | "urgent" | "routine" | "edge-case";

export const DEFAULT_PRIORITY_BY_RISK: Record<RiskBand, OpsPriority> = {
  immediate: "immediate",
  urgent: "urgent",
  routine: "routine",
};

export type PriorityOverrideInput = {
  isAfterHours?: boolean;
  systemLoad?: "normal" | "high";
};

export function computePriority(
  band: RiskBand,
  o: PriorityOverrideInput = {}
): OpsPriority {
  if (band === "routine" && o.isAfterHours) return "batch";
  if (band === "urgent" && o.systemLoad === "high") return "immediate";
  return DEFAULT_PRIORITY_BY_RISK[band];
}

export const SUGGESTED_RISK_BY_TEST: Record<TestCategory, RiskBand> = {
  emergency: "immediate",
  urgent: "urgent",
  routine: "routine",
  "edge-case": "routine",
};