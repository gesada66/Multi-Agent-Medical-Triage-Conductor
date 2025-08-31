'use client';

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Phone, FileText, ExternalLink } from "lucide-react";
import { CarePlan } from "@/lib/types";

interface PlanCardProps {
  carePlan?: CarePlan | null;
  isLoading?: boolean;
  onViewRationale?: () => void;
  className?: string;
}

const getDispositionIcon = (disposition: string) => {
  switch (disposition.toLowerCase()) {
    case 'emergency':
      return <Phone className="h-4 w-4 text-red-600" />;
    case 'urgent':
      return <Clock className="h-4 w-4 text-orange-500" />;
    case 'routine':
      return <MapPin className="h-4 w-4 text-blue-600" />;
    case 'self-care':
      return <FileText className="h-4 w-4 text-green-600" />;
    default:
      return <MapPin className="h-4 w-4 text-gray-500" />;
  }
};

const getDispositionColor = (disposition: string) => {
  switch (disposition.toLowerCase()) {
    case 'emergency':
      return 'border-red-200 bg-red-50';
    case 'urgent':
      return 'border-orange-200 bg-orange-50';
    case 'routine':
      return 'border-blue-200 bg-blue-50';
    case 'self-care':
      return 'border-green-200 bg-green-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
};

const getBadgeVariant = (disposition: string) => {
  switch (disposition.toLowerCase()) {
    case 'emergency':
      return 'destructive';
    case 'urgent':
      return 'secondary';
    case 'routine':
      return 'default';
    case 'self-care':
      return 'outline';
    default:
      return 'outline';
  }
};

export function PlanCard({ carePlan, isLoading = false, onViewRationale, className }: PlanCardProps) {
  if (isLoading) {
    return (
      <Card className={`${className || ''} animate-pulse`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="h-6 w-20 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-56 bg-gray-200 rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-12 bg-gray-200 rounded" />
          </div>
          <div className="h-10 w-full bg-gray-200 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!carePlan) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <span>Care Plan</span>
          </CardTitle>
          <CardDescription>
            Complete risk assessment to view care recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No care plan available
          </div>
        </CardContent>
      </Card>
    );
  }

  const dispositionIcon = getDispositionIcon(carePlan.disposition);
  const cardColorClass = getDispositionColor(carePlan.disposition);
  const badgeVariant = getBadgeVariant(carePlan.disposition);

  return (
    <Card className={`${className || ''} ${cardColorClass}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {dispositionIcon}
            <span>Care Plan</span>
          </CardTitle>
          <Badge variant={badgeVariant as any}>
            {carePlan.disposition.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          Recommended care pathway based on clinical assessment
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {carePlan.primaryRecommendation && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              PRIMARY RECOMMENDATION
            </h4>
            <div className="p-3 rounded-md bg-white border border-gray-200">
              <p className="text-sm font-medium leading-relaxed">
                {carePlan.primaryRecommendation}
              </p>
            </div>
          </div>
        )}

        {carePlan.actions && carePlan.actions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              RECOMMENDED ACTIONS
            </h4>
            <div className="space-y-2">
              {carePlan.actions.map((action, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 rounded-md bg-white border border-gray-100">
                  <span className="text-blue-600 mt-1 text-xs">●</span>
                  <span className="text-sm">{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {carePlan.timeframe && (
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Timeframe:</span>
            <span>{carePlan.timeframe}</span>
          </div>
        )}

        {carePlan.followUp && carePlan.followUp.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              FOLLOW-UP CARE
            </h4>
            <div className="space-y-1">
              {carePlan.followUp.map((item, index) => (
                <div key={index} className="text-sm flex items-start space-x-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {carePlan.warnings && carePlan.warnings.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-orange-200">
            <h4 className="text-sm font-semibold text-orange-700">
              IMPORTANT WARNINGS
            </h4>
            <div className="space-y-1">
              {carePlan.warnings.map((warning, index) => (
                <div key={index} className="text-sm flex items-start space-x-2 p-2 rounded-md bg-orange-50 border border-orange-200">
                  <span className="text-orange-600 mt-1">⚠</span>
                  <span className="text-orange-800">{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {onViewRationale && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={onViewRationale}
              className="w-full flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>View Clinical Rationale</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}

        {carePlan.confidence && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Plan Confidence: {Math.round(carePlan.confidence * 100)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}