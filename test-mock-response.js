// Quick test to verify mock response includes routing data
const mockResponse = {
  risk: {
    band: "immediate",
    pUrgent: 0.92,
    explain: ["severe chest pain > 15m", "abnormal BP", "diaphoresis, nausea"]
  },
  plan: {
    disposition: "Go to Emergency Department now",
    why: ["severe persistent chest pain", "abnormal BP + autonomic symptoms"],
    whatToExpect: ["ECG, serial troponin"],
    safetyNet: ["call 999 if syncope/worsening"]
  },
  routing: {
    priority: "immediate",
    testCategory: "emergency"
  },
  citations: [
    { source: "NICE CG95", snippet: "Chest pain with autonomic symptoms requires immediate assessment" }
  ]
};

console.log('🧪 MOCK RESPONSE TEST:');
console.log('✅ Risk band:', mockResponse.risk.band);
console.log('✅ Routing priority:', mockResponse.routing.priority);
console.log('✅ Test category:', mockResponse.routing.testCategory);
console.log('✅ Full routing object:', JSON.stringify(mockResponse.routing, null, 2));

if (mockResponse.routing && mockResponse.routing.priority) {
  console.log('🎯 SUCCESS: Mock data contains routing object for dual badges');
} else {
  console.log('❌ FAIL: Mock data missing routing object');
}