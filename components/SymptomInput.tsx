'use client';

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, AlertCircle, Activity } from "lucide-react";

interface SymptomStep {
  id: string;
  title: string;
  description: string;
  placeholder: string;
  required: boolean;
}

const SYMPTOM_STEPS: SymptomStep[] = [
  {
    id: "chief-complaint",
    title: "Chief Complaint",
    description: "What is the main reason for seeking care today?",
    placeholder: "Describe the primary concern or symptom...",
    required: true
  },
  {
    id: "symptom-details",
    title: "Symptom Details",
    description: "Please provide more details about the symptoms",
    placeholder: "When did it start? How severe is it? What makes it better or worse?",
    required: true
  },
  {
    id: "medical-history",
    title: "Relevant History",
    description: "Any relevant medical history or medications?",
    placeholder: "Previous conditions, current medications, allergies...",
    required: false
  },
  {
    id: "additional-info",
    title: "Additional Information",
    description: "Anything else you think is important?",
    placeholder: "Any other symptoms, concerns, or context...",
    required: false
  }
];

interface SymptomInputProps {
  onSubmit: (symptoms: Record<string, string>) => void;
  isLoading?: boolean;
  className?: string;
}

export function SymptomInput({ onSubmit, isLoading = false, className }: SymptomInputProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [symptoms, setSymptoms] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const currentStepData = SYMPTOM_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === SYMPTOM_STEPS.length - 1;

  const handleInputChange = (value: string) => {
    setSymptoms(prev => ({
      ...prev,
      [currentStepData.id]: value
    }));
    
    if (errors[currentStepData.id]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[currentStepData.id];
        return newErrors;
      });
    }
  };

  const validateCurrentStep = (): boolean => {
    if (currentStepData.required && !symptoms[currentStepData.id]?.trim()) {
      setErrors(prev => ({
        ...prev,
        [currentStepData.id]: "This field is required"
      }));
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, SYMPTOM_STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    if (validateCurrentStep()) {
      onSubmit(symptoms);
    }
  };

  const completedSteps = Object.keys(symptoms).filter(key => 
    symptoms[key]?.trim() && SYMPTOM_STEPS.find(s => s.id === key)
  ).length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle>Symptom Assessment</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Step {currentStep + 1} of {SYMPTOM_STEPS.length}
          </Badge>
        </div>
        <CardDescription>
          {currentStepData.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">{currentStepData.title}</h3>
            {currentStepData.required && (
              <Badge variant="secondary" className="text-xs">Required</Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <Textarea
              placeholder={currentStepData.placeholder}
              value={symptoms[currentStepData.id] || ""}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`min-h-[120px] resize-none ${
                errors[currentStepData.id] ? "border-red-500 focus:border-red-500" : ""
              }`}
              disabled={isLoading}
            />
            {errors[currentStepData.id] && (
              <div className="flex items-center space-x-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{errors[currentStepData.id]}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep || isLoading}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <div className="flex space-x-1">
            {SYMPTOM_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-blue-600"
                    : index < currentStep || symptoms[SYMPTOM_STEPS[index].id]?.trim()
                    ? "bg-blue-300"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || completedSteps === 0}
              className="flex items-center space-x-2"
            >
              <span>{isLoading ? "Processing..." : "Start Triage"}</span>
              {!isLoading && <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Completed: {completedSteps} / {SYMPTOM_STEPS.length} sections
        </div>
      </CardContent>
    </Card>
  );
}