'use client';

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, AlertCircle, Info } from "lucide-react";
import type { TRiskAssessment, TRoutingMeta } from "@/lib/schemas";

interface RiskCardProps {
  risk: TRiskAssessment;
  routing?: TRoutingMeta;
  isLoading?: boolean;
  className?: string;
}

const bandColor: Record<TRiskAssessment["band"], string> = {
  immediate: "bg-red-600",
  urgent: "bg-amber-500",
  routine: "bg-emerald-600",
};

const priorityColor: Record<Exclude<TRoutingMeta["priority"], never>, string> = {
  immediate: "bg-red-600/80",
  urgent: "bg-amber-500/80",
  routine: "bg-emerald-600/80",
  batch: "bg-indigo-600/80",
};

const getRiskIcon = (band: string) => {
  switch (band) {
    case 'immediate':
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    case 'urgent':
      return <AlertCircle className="h-5 w-5 text-orange-500" />;
    case 'routine':
      return <Shield className="h-5 w-5 text-green-600" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

const getRiskColor = (band: string) => {
  switch (band) {
    case 'immediate':
      return 'border-red-200 bg-red-50';
    case 'urgent':
      return 'border-orange-200 bg-orange-50';
    case 'routine':
      return 'border-green-200 bg-green-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
};

export function RiskCard({ risk, routing, isLoading = false, className }: RiskCardProps) {
  if (isLoading) {
    return (
      <Card className={`${className || ''} animate-pulse`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-gray-200 rounded" />
            <div className="h-6 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="space-y-2 mt-4">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!risk) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <span>Risk Assessment</span>
          </CardTitle>
          <CardDescription>
            Complete symptom assessment to view risk analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No assessment available
          </div>
        </CardContent>
      </Card>
    );
  }

  const riskIcon = getRiskIcon(risk.band);
  const cardColorClass = getRiskColor(risk.band);

  return (
    <TooltipProvider>
      <Card className={`${className || ''} ${cardColorClass}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              {riskIcon}
              <span>Risk Assessment</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={"text-white " + bandColor[risk.band]}>{risk.band.toUpperCase()}</Badge>
              {routing?.priority && (
                <Badge className={"text-white " + priorityColor[routing.priority]}>
                  PRIORITY: {routing.priority.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>
            Clinical risk stratification based on presented symptoms
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">Probability urgent: <span className="font-medium text-foreground">{Math.round(risk.pUrgent*100)}%</span></div>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {risk.explain.map((e,i)=>(<li key={i}>{e}</li>))}
          </ul>
          {process.env.NODE_ENV !== "production" && routing?.testCategory && (
            <div className="text-xs text-muted-foreground">Test tag: <span className="font-mono">{routing.testCategory}</span></div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}