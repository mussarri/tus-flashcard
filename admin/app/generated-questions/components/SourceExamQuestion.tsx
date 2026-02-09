'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SourceExamQuestionProps {
  sourceExamQuestionId?: string;
}

export function SourceExamQuestion({
  sourceExamQuestionId,
}: SourceExamQuestionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sourceExamQuestionId) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">
          Source Exam Question
        </span>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      
      {expanded && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600 italic">
            Source question ID: {sourceExamQuestionId}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            (Read-only - original exam question reference)
          </p>
        </div>
      )}
    </div>
  );
}
