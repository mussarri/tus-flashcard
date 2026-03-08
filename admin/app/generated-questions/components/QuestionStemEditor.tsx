'use client';

interface QuestionStemEditorProps {
  question: string;
  isEditing: boolean;
  onChange: (value: string) => void;
}

export function QuestionStemEditor({
  question,
  isEditing,
  onChange,
}: QuestionStemEditorProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Question
      </label>
      {isEditing ? (
        <textarea
          value={question}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter question text..."
        />
      ) : (
        <p className="text-gray-900 leading-relaxed">{question}</p>
      )}
    </div>
  );
}
