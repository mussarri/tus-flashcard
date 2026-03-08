'use client';

import { CheckCircle } from 'lucide-react';

interface OptionsEditorProps {
  options: Record<string, string>;
  correctAnswer: string;
  isEditing: boolean;
  onOptionChange: (key: string, value: string) => void;
  onCorrectAnswerChange: (key: string) => void;
}

export function OptionsEditor({
  options,
  correctAnswer,
  isEditing,
  onOptionChange,
  onCorrectAnswerChange,
}: OptionsEditorProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Options
      </label>
      <div className="space-y-2">
        {Object.entries(options).map(([key, value]) => {
          const isCorrect = key === correctAnswer;
          
          return (
            <div
              key={key}
              className={`p-3 rounded-lg border-2 transition-colors ${
                isCorrect
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                {isEditing ? (
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={isCorrect}
                    onChange={() => onCorrectAnswerChange(key)}
                    className="mt-1 w-4 h-4 text-green-600"
                  />
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isCorrect ? 'border-green-600 bg-green-600' : 'border-gray-300'
                    }`}
                  >
                    {isCorrect && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900">{key}.</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onOptionChange(key, e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 ml-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <span className="ml-2 text-gray-900">{value}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
