'use client';

interface ExplanationEditorProps {
  explanation: string;
  isEditing: boolean;
  onChange: (value: string) => void;
}

export function ExplanationEditor({
  explanation,
  isEditing,
  onChange,
}: ExplanationEditorProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Explanation
      </label>
      {isEditing ? (
        <textarea
          value={explanation}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter explanation..."
        />
      ) : (
        <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">
          {explanation || 'No explanation provided'}
        </p>
      )}
    </div>
  );
}
