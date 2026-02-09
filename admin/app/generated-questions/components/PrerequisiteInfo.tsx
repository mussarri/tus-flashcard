'use client';

import { AlertCircle } from 'lucide-react';

interface PrerequisiteInfoProps {
  prerequisite?: {
    id: string;
    name: string;
  };
  linkedConcepts?: Array<{
    knowledgePoint: {
      id: string;
      fact: string;
    };
  }>;
}

export function PrerequisiteInfo({
  prerequisite,
  linkedConcepts,
}: PrerequisiteInfoProps) {
  if (!prerequisite && (!linkedConcepts || linkedConcepts.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Prerequisite */}
      {prerequisite && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">
              Prerequisite
            </span>
          </div>
          <p className="text-sm text-purple-700">{prerequisite.name}</p>
        </div>
      )}

      {/* Linked Concepts */}
      {linkedConcepts && linkedConcepts.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Linked Concepts
          </label>
          <div className="flex flex-wrap gap-2">
            {linkedConcepts.map((qkp) => (
              <span
                key={qkp.knowledgePoint.id}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {qkp.knowledgePoint.fact}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
