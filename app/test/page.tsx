'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Test Page - Styling Debug</h1>
        
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle className="text-xl text-blue-600">Test Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">This is a test card to debug styling issues.</p>
            <div className="space-x-2">
              <Button className="bg-blue-600 text-white">Primary Button</Button>
              <Button variant="outline">Outline Button</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow">
            <h3 className="font-semibold mb-2">Left Card</h3>
            <p>Testing grid layout</p>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow">
            <h3 className="font-semibold mb-2">Right Card</h3>
            <p>Testing grid layout</p>
          </div>
        </div>
      </div>
    </div>
  );
}