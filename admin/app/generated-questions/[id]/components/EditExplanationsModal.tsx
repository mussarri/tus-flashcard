/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";

interface EditExplanationsModalProps {
  questionCard: {
    mainExplanation: string | null;
    optionsMetadata: Record<string, any> | null;
    clinicalCorrelation: string | null;
    options: Record<string, string>;
  };
  onSave: (data: {
    mainExplanation: string;
    optionsMetadata: Record<string, any>;
    clinicalCorrelation: string;
  }) => void;
  onClose: () => void;
  saving: boolean;
}

export function EditExplanationsModal({
  questionCard,
  onSave,
  onClose,
  saving,
}: EditExplanationsModalProps) {
  const [mainExplanation, setMainExplanation] = useState(
    questionCard.mainExplanation || "",
  );
  const [clinicalCorrelation, setClinicalCorrelation] = useState(
    questionCard.clinicalCorrelation || "",
  );
  const [optionsMetadata, setOptionsMetadata] = useState(
    questionCard.optionsMetadata || {},
  );

  const optionKeys = Object.keys(questionCard.options).sort();

  const handleOptionExplanationChange = (key: string, value: string) => {
    setOptionsMetadata({
      ...optionsMetadata,
      [key]: {
        ...optionsMetadata[key],
        wouldBeCorrectIf: value,
      },
    });
  };

  const handleSave = () => {
    onSave({
      mainExplanation,
      optionsMetadata,
      clinicalCorrelation,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Edit Explanations
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Explanation */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              📖 Main Explanation
            </label>
            <textarea
              value={mainExplanation}
              onChange={(e) => setMainExplanation(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Explain why the correct answer is correct and the key concepts..."
            />
            <p className="mt-1 text-xs text-gray-500">
              This explanation appears first after the student submits their
              answer.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ❌ Per-Option Explanations
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Explain why each wrong option would have been correct under
              different circumstances. This helps students understand common
              misconceptions.
            </p>

            <div className="space-y-4">
              {optionKeys.map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Option {key}:{" "}
                    <span className="text-gray-500">
                      {questionCard.options[key]}
                    </span>
                  </label>
                  <textarea
                    value={optionsMetadata[key]?.wouldBeCorrectIf || ""}
                    onChange={(e) =>
                      handleOptionExplanationChange(key, e.target.value)
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                    placeholder={`Would be correct if...`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              🩺 Clinical Correlation
            </label>
            <textarea
              value={clinicalCorrelation}
              onChange={(e) => setClinicalCorrelation(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Connect this concept to clinical scenarios, patient presentations, or real-world medical practice..."
            />
            <p className="mt-1 text-xs text-gray-500">
              This section helps students understand practical applications.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
