'use client';

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Bot, CheckCircle, AlertCircle, Info } from "lucide-react";
import { TimelineEntry } from "@/lib/types";

interface TimelineProps {
  entries?: TimelineEntry[];
  isLoading?: boolean;
  className?: string;
}

const getEventIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'user_input':
      return <User className="h-4 w-4 text-blue-600" />;
    case 'agent_processing':
      return <Bot className="h-4 w-4 text-purple-600" />;
    case 'assessment_complete':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};

const getEventColor = (type: string) => {
  switch (type.toLowerCase()) {
    case 'user_input':
      return 'border-l-blue-500 bg-blue-50';
    case 'agent_processing':
      return 'border-l-purple-500 bg-purple-50';
    case 'assessment_complete':
      return 'border-l-green-500 bg-green-50';
    case 'warning':
      return 'border-l-orange-500 bg-orange-50';
    case 'error':
      return 'border-l-red-500 bg-red-50';
    default:
      return 'border-l-gray-300 bg-gray-50';
  }
};

const getBadgeVariant = (type: string) => {
  switch (type.toLowerCase()) {
    case 'user_input':
      return 'default';
    case 'agent_processing':
      return 'secondary';
    case 'assessment_complete':
      return 'outline';
    case 'warning':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatDuration = (duration?: number) => {
  if (!duration) return null;
  if (duration < 1000) return `${Math.round(duration)}ms`;
  return `${(duration / 1000).toFixed(2)}s`;
};

export function Timeline({ entries, isLoading = false, className }: TimelineProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <span>Processing Timeline</span>
        </CardTitle>
        <CardDescription>
          Real-time triage processing history and agent activity
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!entries || entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No timeline events yet</p>
            <p className="text-xs">Start a triage assessment to see processing history</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-4">
              {entries.map((entry, index) => {
                const eventIcon = getEventIcon(entry.eventType);
                const colorClass = getEventColor(entry.eventType);
                const badgeVariant = getBadgeVariant(entry.eventType);
                const isLast = index === entries.length - 1;
                
                return (
                  <div key={entry.id || index} className="relative flex space-x-3">
                    {/* Timeline connector */}
                    {!isLast && (
                      <div 
                        className="absolute left-4 top-8 w-0.5 h-full bg-gray-200"
                        style={{ height: 'calc(100% + 1rem)' }}
                      />
                    )}
                    
                    {/* Event icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center relative z-10">
                      {eventIcon}
                    </div>
                    
                    {/* Event content */}
                    <div className="flex-1 min-w-0">
                      <div className={`p-3 rounded-lg border-l-4 ${colorClass}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={badgeVariant as any} className="text-xs">
                              {entry.eventType.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {entry.agent && (
                              <Badge variant="outline" className="text-xs">
                                {entry.agent}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 leading-relaxed mb-2">
                          {entry.description}
                        </p>
                        
                        {entry.details && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            {Object.entries(entry.details).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="capitalize">{key.replace('_', ' ')}:</span>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                          <div className="flex items-center space-x-4">
                            {entry.duration && (
                              <span>Duration: {formatDuration(entry.duration)}</span>
                            )}
                            {entry.status && (
                              <Badge 
                                variant={entry.status === 'success' ? 'outline' : 'secondary'} 
                                className="text-xs"
                              >
                                {entry.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}