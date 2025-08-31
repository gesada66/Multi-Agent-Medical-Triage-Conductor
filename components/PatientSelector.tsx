'use client';

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import { Patient, MOCK_PATIENTS } from "@/lib/types";

interface PatientSelectorProps {
  selectedPatient: Patient | null;
  onPatientChange: (patient: Patient | null) => void;
  className?: string;
}

export function PatientSelector({ 
  selectedPatient, 
  onPatientChange, 
  className 
}: PatientSelectorProps) {
  const handleValueChange = (value: string) => {
    if (value === 'none') {
      onPatientChange(null);
      return;
    }
    
    const patient = MOCK_PATIENTS.find(p => p.id === value);
    onPatientChange(patient || null);
  };

  return (
    <div className={`flex items-center space-x-2 ${className || ''}`}>
      <User className="h-4 w-4 text-muted-foreground" />
      <Select 
        value={selectedPatient?.id || 'none'} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select patient..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Select patient...</SelectItem>
          {MOCK_PATIENTS.map((patient) => (
            <SelectItem key={patient.id} value={patient.id}>
              <div className="flex flex-col">
                <span className="font-medium">{patient.name}</span>
                <span className="text-xs text-muted-foreground">
                  {patient.age}y, {patient.gender}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}