'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { nhsColors, clinicalVariants, createNHSClassName } from '@/components/ui/nhs-design-system';

// Types for clinical data
interface PatientContext {
  age: number;
  gender: string;
  conditions: string[];
  medications: string[];
  allergies: string[];
}

interface RiskAssessment {
  band: 'immediate' | 'urgent' | 'routine';
  probability: number;
  redFlags: string[];
  confidence: number;
}

interface TriageAnalysis {
  evidence: any;
  risk: RiskAssessment;
  plan: any;
  counterfactual?: {
    scenarios: Array<{
      description: string;
      improvement: number;
      confidence: number;
    }>;
  };
}

export function ClinicalCommandCenter() {
  const [symptomInput, setSymptomInput] = useState('');
  const [patientContext, setPatientContext] = useState<PatientContext>({
    age: 0,
    gender: '',
    conditions: [],
    medications: [],
    allergies: []
  });
  const [analysis, setAnalysis] = useState<TriageAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleTriageAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate API call to our triage system
    setTimeout(() => {
      setAnalysis({
        evidence: {
          presentingComplaint: symptomInput,
          features: {
            onset: 'acute',
            severity: 'severe',
            redFlags: ['chest pain', 'sweating', 'nausea']
          }
        },
        risk: {
          band: 'immediate',
          probability: 0.89,
          redFlags: ['chest pain', 'sweating', 'nausea'],
          confidence: 0.87
        },
        plan: {
          disposition: 'Emergency Department - Immediate',
          investigations: ['ECG', 'Troponin', 'Chest X-ray'],
          treatments: ['Aspirin 300mg', 'GTN sublingual']
        },
        counterfactual: {
          scenarios: [
            {
              description: 'If ECG performed immediately vs after bloods',
              improvement: 15,
              confidence: 0.82
            },
            {
              description: 'If GTN given 5 minutes earlier',
              improvement: 23,
              confidence: 0.76
            }
          ]
        }
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* NHS Header */}
      <header className="bg-[#005EB8] text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold">NHS</div>
            <div className="border-l border-blue-300 pl-4">
              <h1 className="text-xl font-semibold">Medical Triage Conductor</h1>
              <div className="flex items-center space-x-4 text-sm">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  Live System
                </span>
                <span>24 Active Patients</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">Dr. Sarah Johnson</div>
            <div className="text-sm text-blue-200">Emergency Consultant</div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Primary Triage Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl text-slate-800">Patient Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Symptom Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Patient Symptoms
              </label>
              <Textarea
                placeholder="Describe patient symptoms in detail..."
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                className="min-h-[100px] text-base"
              />
            </div>

            {/* Patient Context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                <Input
                  type="number"
                  value={patientContext.age || ''}
                  onChange={(e) => setPatientContext({
                    ...patientContext,
                    age: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-md"
                  value={patientContext.gender}
                  onChange={(e) => setPatientContext({
                    ...patientContext,
                    gender: e.target.value
                  })}
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">NHS Number</label>
                <Input placeholder="123 456 7890" />
              </div>
            </div>

            {/* Action Button */}
            <Button 
              onClick={handleTriageAnalysis}
              disabled={!symptomInput.trim() || isAnalyzing}
              className="w-full bg-[#005EB8] hover:bg-[#003087] text-white h-12 text-lg font-medium"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Patient Symptoms'}
            </Button>
          </CardContent>
        </Card>

        {/* AI Analysis Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-slate-800 flex items-center">
              <span className="mr-2">🤖</span>
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <div className="space-y-4">
                {/* Risk Assessment */}
                <div className={`p-4 rounded-lg ${
                  analysis.risk.band === 'immediate' 
                    ? 'bg-red-50 border-l-4 border-red-500' 
                    : analysis.risk.band === 'urgent'
                    ? 'bg-orange-50 border-l-4 border-orange-500'
                    : 'bg-green-50 border-l-4 border-green-500'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`${
                      analysis.risk.band === 'immediate' ? 'bg-red-500' :
                      analysis.risk.band === 'urgent' ? 'bg-orange-500' : 'bg-green-500'
                    } text-white`}>
                      {analysis.risk.band.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-slate-600">
                      {Math.round(analysis.risk.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="text-sm">
                    <strong>Risk Probability:</strong> {Math.round(analysis.risk.probability * 100)}%
                  </div>
                </div>

                {/* Red Flags */}
                {analysis.risk.redFlags.length > 0 && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">🚩 Red Flags Detected</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.risk.redFlags.map((flag, index) => (
                        <Badge key={index} className="bg-red-100 text-red-800 text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Care Plan */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">📋 Recommended Actions</h4>
                  <div className="text-sm text-blue-700">
                    <div><strong>Disposition:</strong> {analysis.plan.disposition}</div>
                    {analysis.plan.investigations && (
                      <div className="mt-2">
                        <strong>Investigations:</strong>
                        <ul className="ml-4 mt-1">
                          {analysis.plan.investigations.map((inv: string, index: number) => (
                            <li key={index} className="list-disc">{inv}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* North-Star: Counterfactual Analysis */}
                {analysis.counterfactual && (
                  <div className="bg-purple-50 p-3 rounded-lg border">
                    <h4 className="font-medium text-purple-800 mb-2">💡 What-If Analysis</h4>
                    {analysis.counterfactual.scenarios.map((scenario, index) => (
                      <div key={index} className="text-sm text-purple-700 mb-2 last:mb-0">
                        <div className="font-medium">{scenario.description}:</div>
                        <div className="text-purple-600">
                          <span className="text-green-600 font-medium">
                            {scenario.improvement}% improvement
                          </span>
                          <span className="ml-2 text-slate-500">
                            (confidence: {Math.round(scenario.confidence * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">
                <div className="text-4xl mb-4">🏥</div>
                <p>Enter patient symptoms to begin AI analysis</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Population Health Monitor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-slate-800 flex items-center">
              <span className="mr-2">📊</span>
              Population Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alert Banner */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-lg">
              <div className="flex items-center">
                <span className="text-yellow-800 font-medium text-sm">
                  ⚠️ Respiratory illness spike detected
                </span>
              </div>
              <div className="text-yellow-700 text-xs mt-1">
                +23% increase in respiratory symptoms (last 48h)
              </div>
            </div>

            {/* Capacity Indicators */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">ED Capacity</span>
                <div className="flex items-center">
                  <div className="w-16 bg-slate-200 rounded-full h-2 mr-2">
                    <div className="bg-orange-500 h-2 rounded-full w-3/4"></div>
                  </div>
                  <span className="font-medium text-orange-600">78%</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Wait Time</span>
                <span className="font-medium text-slate-800">45 min</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Triage Queue</span>
                <span className="font-medium text-slate-800">12 patients</span>
              </div>
            </div>

            {/* Ward Statistics */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <h5 className="font-medium text-slate-800 mb-2 text-sm">Today's Activity</h5>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Immediate:</span>
                  <span className="font-medium text-red-600">3</span>
                </div>
                <div className="flex justify-between">
                  <span>Urgent:</span>
                  <span className="font-medium text-orange-600">8</span>
                </div>
                <div className="flex justify-between">
                  <span>Routine:</span>
                  <span className="font-medium text-green-600">13</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Similar Cases / Temporal GraphRAG Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl text-slate-800 flex items-center">
              <span className="mr-2">🔗</span>
              Similar Patient Journeys
              <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">North-Star Feature</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-700 mb-3">
                <strong>Temporal GraphRAG Analysis:</strong> Found 5 patients with similar presentation patterns
              </div>
              
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border border-purple-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-slate-800">Male, 58, Chest Pain + Nausea</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">95% similarity</Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    <div>Pathway: Triage → ECG (immediate) → Troponin → Cardiology</div>
                    <div className="text-green-600 mt-1">✓ STEMI diagnosed in 12 minutes</div>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded border border-purple-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-slate-800">Male, 61, Chest Pain + Sweating</span>
                    <Badge className="bg-green-100 text-green-800 text-xs">89% similarity</Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    <div>Pathway: Triage → Bloods → ECG → Cardiology</div>
                    <div className="text-orange-600 mt-1">⚠️ Diagnosis delayed by 28 minutes</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-1">📈 Pathway Optimization</div>
                <div className="text-xs text-blue-700">
                  Based on similar cases: Recommend immediate ECG over blood work first.
                  Expected time savings: 15-25 minutes to diagnosis.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}