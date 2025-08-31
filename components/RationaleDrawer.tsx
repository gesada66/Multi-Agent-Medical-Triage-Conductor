'use client';

import * as React from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";

// GOTCHA: RationaleDrawer expects specific data structure that differs from lib/types.ts
// Expected structure:
// - rationale.summary: string
// - rationale.reasoning: string[] (array of strings, not objects)  
// - rationale.evidence: string[] (array of strings, not objects)
// - rationale.citations: object[] with title/url properties
// WARNING: Passing objects as React children will cause render errors
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BookOpen, ExternalLink, X, Clock, User, Brain } from "lucide-react";
import { Rationale } from "@/lib/types";

interface RationaleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rationale?: Rationale | null;
  isLoading?: boolean;
}

export function RationaleDrawer({ 
  open, 
  onOpenChange, 
  rationale, 
  isLoading = false 
}: RationaleDrawerProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const renderCitation = (citation: any, index: number) => (
    <div key={index} className="p-3 border rounded-lg bg-gray-50 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-sm">{citation.title}</p>
          {citation.authors && citation.authors.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {citation.authors.join(', ')}
            </p>
          )}
          {citation.journal && (
            <p className="text-xs text-muted-foreground">
              {citation.journal} {citation.year && `(${citation.year})`}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-xs">
          {citation.type || 'Reference'}
        </Badge>
      </div>
      
      {citation.relevance && (
        <p className="text-sm text-gray-700">
          <span className="font-medium">Relevance:</span> {citation.relevance}
        </p>
      )}
      
      {citation.url && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => window.open(citation.url, '_blank')}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View Source
        </Button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          
          <div className="px-4 pb-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh] bg-background text-foreground z-[100]">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span>Clinical Rationale</span>
              </DrawerTitle>
              <DrawerDescription>
                Evidence-based reasoning and clinical references
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-6">
          {!rationale ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Assessment Summary</span>
                </h3>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm leading-relaxed">Clinical rationale will appear here after triage analysis is complete.</p>
                </div>
              </div>
              <div className="text-center py-4 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Run a triage analysis to see detailed clinical reasoning</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Assessment Summary */}
              {rationale.summary && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span>Assessment Summary</span>
                  </h3>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm leading-relaxed">{rationale.summary}</p>
                  </div>
                </div>
              )}

              {/* Clinical Reasoning */}
              {rationale.reasoning && rationale.reasoning.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span>Clinical Reasoning</span>
                  </h3>
                  <div className="space-y-3">
                    {rationale.reasoning.map((step, index) => (
                      <div key={index} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-700">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed">{step}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Evidence & Citations */}
              {rationale.evidence && rationale.evidence.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    <span>Supporting Evidence</span>
                  </h3>
                  <div className="space-y-3">
                    {rationale.evidence.map((evidence, index) => (
                      <div key={index} className="p-3 border border-green-200 rounded-lg bg-green-50">
                        <p className="text-sm leading-relaxed">{evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Citations */}
              {rationale.citations && rationale.citations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <ExternalLink className="h-4 w-4 text-indigo-600" />
                    <span>Clinical References</span>
                  </h3>
                  <div className="space-y-3">
                    {rationale.citations.map((citation, index) => 
                      renderCitation(citation, index)
                    )}
                  </div>
                </div>
              )}

              {/* Confidence & Metadata */}
              {(rationale.confidence !== undefined || rationale.modelUsed || rationale.timestamp) && (
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-semibold flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span>Assessment Metadata</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {rationale.confidence !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Confidence:</span>
                        <Badge variant="outline">
                          {Math.round(rationale.confidence * 100)}%
                        </Badge>
                      </div>
                    )}
                    {rationale.modelUsed && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <Badge variant="outline" className="text-xs">
                          {rationale.modelUsed}
                        </Badge>
                      </div>
                    )}
                    {rationale.timestamp && (
                      <div className="flex justify-between sm:col-span-2">
                        <span className="text-muted-foreground">Generated:</span>
                        <span className="text-xs">
                          {formatTimestamp(rationale.timestamp)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Medical Disclaimer:</strong> This clinical rationale is generated by AI and should be used as a clinical decision support tool only. Always exercise professional clinical judgment and consult current medical literature and guidelines.
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}