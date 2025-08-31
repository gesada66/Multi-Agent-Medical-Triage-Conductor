import { describe, it, expect } from "vitest";
import { computePriority } from "../../lib/taxonomy";

describe("taxonomy priority mapping", () => {
  it("immediate → immediate", () => {
    expect(computePriority("immediate")).toBe("immediate");
  });
  
  it("urgent → urgent (default)", () => {
    expect(computePriority("urgent")).toBe("urgent");
  });
  
  it("routine → routine (default)", () => {
    expect(computePriority("routine")).toBe("routine");
  });
  
  it("urgent → immediate under high load", () => {
    expect(computePriority("urgent", { systemLoad: "high" })).toBe("immediate");
  });
  
  it("routine → batch after hours", () => {
    expect(computePriority("routine", { isAfterHours: true })).toBe("batch");
  });
  
  it("immediate stays immediate regardless of overrides", () => {
    expect(computePriority("immediate", { systemLoad: "high", isAfterHours: true })).toBe("immediate");
  });
  
  it("urgent stays urgent during normal hours and load", () => {
    expect(computePriority("urgent", { systemLoad: "normal", isAfterHours: false })).toBe("urgent");
  });
});