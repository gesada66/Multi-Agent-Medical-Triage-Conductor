import type { TestCategory, RiskBand, OpsPriority } from "./taxonomy";
import { computePriority, SUGGESTED_RISK_BY_TEST } from "./taxonomy";

export function deriveRouting(
  band: RiskBand,
  extras?: { testCategory?: TestCategory; isAfterHours?: boolean; systemLoad?: "normal"|"high" }
): { priority: OpsPriority; testCategory?: TestCategory } {
  const priority = computePriority(band, {
    isAfterHours: extras?.isAfterHours,
    systemLoad: extras?.systemLoad,
  });
  return extras?.testCategory ? { priority, testCategory: extras.testCategory } : { priority };
}

export function assertConsistent(band: RiskBand, testCategory?: TestCategory) {
  if (!testCategory) return;
  const suggested = SUGGESTED_RISK_BY_TEST[testCategory];
  if (process.env.NODE_ENV !== "production" && suggested === "immediate" && band !== "immediate") {
    // warn only in dev; allows negative tests
    console.warn(`[taxonomy] Test tag '${testCategory}' usually implies 'immediate' risk; got '${band}'.`);
  }
}