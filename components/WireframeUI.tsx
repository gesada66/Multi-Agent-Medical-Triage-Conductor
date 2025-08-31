'use client';

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WireframeUI() {
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [mode, setMode] = useState<"patient" | "clinician">("clinician");
  const [symptomText, setSymptomText] = useState("");
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const patients = [
    { id: "p1", name: "John Carter, 45y, Male" },
    { id: "p2", name: "Sarah Wilson, 32y, Female" },
    { id: "p3", name: "Michael Chen, 67y, Male" }
  ];

  // Mock data matching the wireframe
  const riskData = {
    band: "IMMEDIATE" as const,
    probability: 92,
    indicators: [
      "severe chest pain > 15m",
      "abnormal BP", 
      "diaphoresis, nausea"
    ]
  };

  const planData = {
    disposition: "Go to Emergency Department now",
    why: [
      "severe persistent chest pain",
      "abnormal BP + autonomic symptoms"
    ],
    whatToExpect: "ECG, serial troponin",
    safetyNet: "call 999 if syncope/worsening"
  };

  const timelineData = [
    { time: "Yesterday 14:10", text: "mild pain; troponin normal" },
    { time: "Today 08:55", text: "severe pain; GTN given; ECG pending" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <Card 
          className="p-4"
          style={{
            border: '2px solid #d1d5db',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">PATIENT:</span>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Mode:</span>
                <div className="flex gap-2">
                  <Button 
                    variant={mode === "patient" ? "default" : "outline"}
                    onClick={() => setMode("patient")}
                    className="rounded-full"
                  >
                    Patient
                  </Button>
                  <Button 
                    variant={mode === "clinician" ? "default" : "outline"}
                    onClick={() => setMode("clinician")}
                    className="rounded-full"
                  >
                    Clinician
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-full">
                View Rationale
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                ☀
              </Button>
            </div>
          </div>
        </Card>

        {/* Main Grid - 2x2 Card Layout */}
        <div 
          className="gap-6"
          style={{
            display: 'grid',
            gridTemplateColumns: isLargeScreen ? 'repeat(2, 1fr)' : '1fr',
            gridTemplateRows: isLargeScreen ? 'repeat(2, 1fr)' : 'auto auto auto auto',
            alignItems: 'stretch',
            marginTop: '4rem',
            minHeight: '700px'
          }}
        >
          {/* Symptom Intake - Top Left */}
          <Card style={{
            border: '2px solid #d1d5db',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardHeader>
              <CardTitle className="text-xl">Symptom Intake</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              <Textarea 
                placeholder="Describe the symptoms… (textarea)"
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
                className="min-h-[200px] text-base resize-none"
              />
              <div className="flex gap-3 pt-4">
                <Button className="px-8 py-2">[ Triage ]</Button>
                <Button 
                  variant="outline" 
                  className="px-8 py-2"
                  onClick={() => setSymptomText("")}
                >
                  [ Clear ]
                </Button>
              </div>
              {/* Flex spacer to fill remaining space */}
              <div className="flex-1"></div>
            </CardContent>
          </Card>

          {/* Risk Assessment - Top Right */}
          <Card style={{
            border: '2px solid #d1d5db',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardHeader>
              <CardTitle className="text-xl">Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">BAND:</span>
                <Badge className="bg-red-600 text-white px-3 py-1 text-sm font-semibold">
                  [ {riskData.band} ]
                </Badge>
                <span className="text-base font-medium">
                  p(urgent): {riskData.probability}%
                </span>
              </div>
              <div className="space-y-2">
                {riskData.indicators.map((indicator, index) => (
                  <div key={index} className="flex gap-2 text-base">
                    <span className="text-black">•</span>
                    <span>{indicator}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Processing Timeline - Bottom Left */}
          <Card style={{
            border: '2px solid #d1d5db',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardHeader>
              <CardTitle className="text-xl">Processing Timeline</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4 py-2">
                {timelineData.map((item, index) => (
                  <div key={index} className="flex gap-3 text-base p-2 bg-gray-50 rounded-md border">
                    <span className="text-blue-600 font-bold">•</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{item.time}</div>
                      <div className="text-gray-600 mt-1">{item.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Care Plan - Bottom Right */}
          <Card style={{
            border: '2px solid #d1d5db',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardHeader>
              <CardTitle className="text-xl">Care Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div>
                <div className="text-base font-semibold mb-1">Disposition:</div>
                <div className="text-base">{planData.disposition}</div>
              </div>
              
              <div>
                <div className="text-base font-semibold mb-2">Why:</div>
                <div className="space-y-1">
                  {planData.why.map((reason, index) => (
                    <div key={index} className="flex gap-2 text-base">
                      <span>-</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-base font-semibold mb-1">What to expect:</div>
                <div className="text-base">{planData.whatToExpect}</div>
              </div>

              <div>
                <div className="text-base font-semibold mb-1">Safety-net:</div>
                <div className="text-base">{planData.safetyNet}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm py-4">
          Clinical Cards — shadcn/ui + Next.js
        </div>
      </div>
    </div>
  );
}