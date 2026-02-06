'use client';

import { Map, Construction } from 'lucide-react';

export default function LearningPathsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Learning Paths</h1>
          <p className="text-slate-500 mt-1">Create guided course sequences for learners</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-blue-50 rounded-full">
            <Map className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Coming Soon</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          Learning Paths allow you to create structured sequences of courses that guide 
          learners through a curriculum. Group related courses together and track progress 
          through entire learning journeys.
        </p>
        <div className="flex items-center justify-center gap-2 mt-6 text-amber-600">
          <Construction className="w-5 h-5" />
          <span className="text-sm font-medium">Feature in development</span>
        </div>
      </div>
    </div>
  );
}
