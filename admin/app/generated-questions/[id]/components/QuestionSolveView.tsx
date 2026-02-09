/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Check, X } from "lucide-react";

interface QuestionSolveViewProps {
  questionCard: {
    question: string;
    options: Record<string, string>;
    correctAnswer: string;
    mainExplanation: string | null;
    optionsMetadata: Record<string, any> | null;
    clinicalCorrelation: string | null;
    spatialContexts?: Array<{ concept: { preferredLabel: string } }>;
    sourceType?: string;
  };
  solveState: "UNSOLVED" | "SELECTED" | "ANSWERED" | "EDITING";
  selectedOption: string | null;
  isCorrect: boolean | null;
  onOptionSelect: (option: string) => void;
  onSubmit: () => void;
}

export function QuestionSolveView({
  questionCard,
  solveState,
  selectedOption,
  isCorrect,
  onOptionSelect,
  onSubmit,
}: QuestionSolveViewProps) {
  const isAnswered = solveState === "ANSWERED";
  const optionKeys = Object.keys(questionCard.options).sort();

  const getOptionState = (optionKey: string) => {
    if (!isAnswered) {
      return selectedOption === optionKey ? "selected" : "default";
    }

    if (optionKey === questionCard.correctAnswer) {
      return "correct";
    }

    if (optionKey === selectedOption) {
      return "incorrect";
    }

    return "default";
  };

  const getOptionClasses = (optionKey: string) => {
    const state = getOptionState(optionKey);
    const baseClasses =
      "flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all";

    if (isAnswered) {
      if (state === "correct") {
        return `${baseClasses} border-green-500 bg-green-50 cursor-default`;
      }
      if (state === "incorrect") {
        return `${baseClasses} border-red-500 bg-red-50 cursor-default`;
      }
      return `${baseClasses} border-gray-200 bg-gray-50 cursor-default opacity-60`;
    }

    if (state === "selected") {
      return `${baseClasses} border-blue-500 bg-blue-50`;
    }

    return `${baseClasses} border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50`;
  };

  const getBadgeClasses = (optionKey: string) => {
    const state = getOptionState(optionKey);
    const baseClasses =
      "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0";

    if (state === "correct") {
      return `${baseClasses} bg-green-500 text-white`;
    }
    if (state === "incorrect") {
      return `${baseClasses} bg-red-500 text-white`;
    }
    if (state === "selected") {
      return `${baseClasses} bg-blue-500 text-white`;
    }

    return `${baseClasses} bg-gray-200 text-gray-700`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Question Stem */}
      <div className="p-6 border-b border-gray-200">
        {questionCard.sourceType === "EXAM_REPLICA" && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-center">
            <span className="text-amber-900 font-semibold text-sm">
              🟡 Çıkmış Soru (TUS)
            </span>
          </div>
        )}

        <div className="prose max-w-none">
          <p className="text-lg text-gray-900 leading-relaxed whitespace-pre-wrap">
            {questionCard.question}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="p-6 space-y-3">
        {optionKeys.map((key) => (
          <div
            key={key}
            className={getOptionClasses(key)}
            onClick={() => !isAnswered && onOptionSelect(key)}
          >
            <div className={getBadgeClasses(key)}>
              {isAnswered && key === questionCard.correctAnswer ? (
                <Check className="w-5 h-5" />
              ) : isAnswered && key === selectedOption ? (
                <X className="w-5 h-5" />
              ) : (
                key
              )}
            </div>
            <div className="flex-1 text-gray-900">
              {questionCard.options[key]}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      {!isAnswered && (
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onSubmit}
            disabled={!selectedOption}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
              selectedOption
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Submit Answer
          </button>
        </div>
      )}

      {/* Feedback Panel */}
      {isAnswered && (
        <div className="p-6 border-t border-gray-200 space-y-6">
          {/* Result Indicator */}
          <div
            className={`p-4 rounded-lg ${
              isCorrect
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {isCorrect ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-green-900 text-lg">Correct!</p>
                    <p className="text-green-700 text-sm">
                      Well done! Your answer is correct.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                    <X className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-red-900 text-lg">Incorrect</p>
                    <p className="text-red-700 text-sm">
                      The correct answer is {questionCard.correctAnswer}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Explanation */}
          {questionCard.mainExplanation && (
            <div className="space-y-2">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                📖 Main Explanation
              </h3>
              <div className="prose max-w-none text-gray-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="whitespace-pre-wrap">
                  {questionCard.mainExplanation}
                </p>
              </div>
            </div>
          )}

          {/* Wrong Options Explanations */}
          {questionCard.optionsMetadata && (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                ❌ Why other options are wrong
              </h3>
              {optionKeys
                .filter((key) => key !== questionCard.correctAnswer)
                .map((key) => {
                  const metadata = questionCard.optionsMetadata?.[key];
                  if (!metadata?.wouldBeCorrectIf) return null;

                  return (
                    <div
                      key={key}
                      className="p-3 bg-gray-50 rounded border border-gray-200"
                    >
                      <p className="font-semibold text-gray-900 mb-1">
                        Option {key}:
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">
                          Would be correct if:
                        </span>{" "}
                        {metadata.wouldBeCorrectIf}
                      </p>
                      {metadata.clinicalOutcome && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Clinical outcome:</span>{" "}
                          {metadata.clinicalOutcome}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Clinical Correlation */}
          {questionCard.clinicalCorrelation && (
            <details className="group">
              <summary className="cursor-pointer font-bold text-gray-900 flex items-center gap-2 hover:text-blue-600">
                🩺 Clinical Correlation
                <span className="text-sm text-gray-500 ml-auto">
                  Click to expand
                </span>
              </summary>
              <div className="mt-3 prose max-w-none text-gray-700 bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="whitespace-pre-wrap">
                  {questionCard.clinicalCorrelation}
                </p>
              </div>
            </details>
          )}

          {/* Spatial Context */}
          {questionCard.spatialContexts &&
            questionCard.spatialContexts.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer font-bold text-gray-900 flex items-center gap-2 hover:text-blue-600">
                  🧠 Spatial Context (Anatomy)
                  <span className="text-sm text-gray-500 ml-auto">
                    Click to expand
                  </span>
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {questionCard.spatialContexts.map((sc, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full"
                    >
                      {sc.concept.preferredLabel}
                    </span>
                  ))}
                </div>
              </details>
            )}
        </div>
      )}
    </div>
  );
}
