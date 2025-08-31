'use client';

import { useState } from "react";

// SimpleCardsUI - Basic Tailwind-only implementation (fallback version)  
// Use ClinicalCardsUI for full-featured version with toasts, React Query, and rationale drawer
// This component provides basic triage functionality without external dependencies

export default function SimpleCardsUI() {
  const [symptoms, setSymptoms] = useState("");
  const [triageResult, setTriageResult] = useState<any>(null);

  const handleTriage = async () => {
    // Mock triage delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setTriageResult({
      risk: "IMMEDIATE",
      probability: 92,
      disposition: "Go to Emergency Department now"
    });
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <select className="border rounded px-3 py-2 bg-white">
                <option>John Carter, 45y, Male</option>
                <option>Sarah Wilson, 32y, Female</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-sm">Patient</span>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
                <span className="text-sm">Clinician</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded hover:bg-gray-50">
                View Rationale
              </button>
              <button className="px-3 py-2 border rounded hover:bg-gray-50">
                ☀
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column */}
          <div className="space-y-6">
            {/* Symptom Intake */}
            <div className="bg-slate-50 rounded-xl shadow-lg border border-gray-200">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">Symptom Intake</h2>
              </div>
              <div className="p-4">
                <textarea 
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                  placeholder="Describe the symptoms..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={handleTriage}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Triage
                  </button>
                  <button 
                    onClick={() => setSymptoms("")}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-slate-50 rounded-xl shadow-lg border border-gray-200">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">Timeline</h2>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mt-1"></div>
                    <div>
                      <div className="text-xs text-gray-500">Yesterday 14:10</div>
                      <div className="text-sm">Mild chest discomfort; troponin normal.</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mt-1"></div>
                    <div>
                      <div className="text-xs text-gray-500">Today 08:55</div>
                      <div className="text-sm">Severe pain; GTN given; ECG pending.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {triageResult ? (
              <>
                {/* Risk Assessment */}
                <div className="bg-slate-50 rounded-xl shadow-lg border border-gray-200">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Risk Assessment</h2>
                      <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded">
                        {triageResult.risk}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-gray-600 mb-2">
                      Probability urgent: <span className="font-medium text-gray-900">{triageResult.probability}%</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      <li>• severe chest pain &gt; 15m</li>
                      <li>• abnormal BP</li>
                      <li>• diaphoresis, nausea</li>
                    </ul>
                  </div>
                </div>

                {/* Care Plan */}
                <div className="bg-slate-50 rounded-xl shadow-lg border border-gray-200">
                  <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold">Care Plan</h2>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-sm text-gray-600">Disposition</div>
                      <div className="font-medium">{triageResult.disposition}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Why</div>
                      <ul className="text-sm space-y-1">
                        <li>- severe persistent chest pain</li>
                        <li>- abnormal BP + autonomic symptoms</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">What to expect</div>
                      <div className="text-sm">ECG, serial troponin</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Safety-net</div>
                      <div className="text-sm">call 999 if syncope/worsening</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-50 rounded-xl shadow-lg border border-gray-200 p-8 text-center text-gray-500">
                Results will appear here after triage.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}