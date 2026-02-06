'use client';

import { Map, Construction } from 'lucide-react';

export default function LearningPathsPage() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Learning Paths</h1>
          <p className="text-sm text-slate-500 mt-1">Create guided course sequences for learners</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 md:p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 md:p-4 bg-blue-50 rounded-full">
            <Map className="w-10 md:w-12 h-10 md:h-12 text-blue-600" />
          </div>
        </div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">Coming Soon</h2>
        <p className="text-sm md:text-base text-slate-500 max-w-md mx-auto">
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
