'use client';

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SymptomInputSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Skeleton className="h-10 w-24" />
          <div className="flex space-x-1">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-2 h-2 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <Skeleton className="h-4 w-48 mx-auto" />
      </CardContent>
    </Card>
  );
}

export function RiskCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={`${className || ''} animate-pulse`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="space-y-2 mt-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlanCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={`${className || ''} animate-pulse`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export function TimelineSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex space-x-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between ${className || ''}`}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-8 w-48" />
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}

export function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 animate-pulse">
      {/* Header */}
      <HeaderSkeleton className="mb-8 pb-4 border-b" />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <SymptomInputSkeleton />
          <TimelineSkeleton />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <RiskCardSkeleton />
          <PlanCardSkeleton />
        </div>
      </div>
    </div>
  );
}