'use client';

import { FileQuestion, BookOpen, Clock } from 'lucide-react';
import { GeneratedQuestion, EditState } from './types';
import { QuestionStemEditor } from './QuestionStemEditor';
import { OptionsEditor } from './OptionsEditor';
import { ExplanationEditor } from './ExplanationEditor';
import { PrerequisiteInfo } from './PrerequisiteInfo';
import { SourceExamQuestion } from './SourceExamQuestion';
import { ReviewActions } from './ReviewActions';

interface QuestionReviewPanelProps {
  question: GeneratedQuestion | null;
  isEditing: boolean;
  editState: EditState;
  onEditStateChange: (state: Partial<EditState>) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export function QuestionReviewPanel({
  question,
  isEditing,
  editState,
  onEditStateChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onApprove,
  onReject,
}: QuestionReviewPanelProps) {
  if (!question) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>Select a question to review</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      PENDING: { color: 'bg-gray-100 text-gray-700', label: 'Pending' },
      APPROVED: { color: 'bg-green-100 text-green-700', label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-700', label: 'Rejected' },
    };
    const c = config[status] || config.PENDING;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${c.color}`}>
        {c.label}
      </span>
    );
  };

  const getDifficultyBadge = (difficulty?: string) => {
    const config: Record<string, { color: string; label: string }> = {
      EASY: { color: 'bg-green-100 text-green-700', label: 'Easy' },
      MEDIUM: { color: 'bg-yellow-100 text-yellow-700', label: 'Medium' },
      HARD: { color: 'bg-red-100 text-red-700', label: 'Hard' },
    };
    const c = config[difficulty || 'MEDIUM'] || config.MEDIUM;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${c.color}`}>
        {c.label}
      </span>
    );
  };

  const isApproveDisabled = () => {
    if (isEditing) {
      return !editState.correctAnswer || Object.keys(editState.options).length === 0;
    }
    return !question.correctAnswer;
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusBadge(question.approvalStatus)}
            {getDifficultyBadge(question.difficulty)}
            {question.scenarioType && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                {question.scenarioType}
              </span>
            )}
          </div>
          
          <ReviewActions
            isPending={question.approvalStatus === 'PENDING'}
            isEditing={isEditing}
            isApproveDisabled={isApproveDisabled()}
            onEdit={onStartEdit}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
            onApprove={onApprove}
            onReject={onReject}
          />
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>
              {question.lesson?.name}
              {question.topic && ` → ${question.topic.name}`}
              {question.subtopic && ` → ${question.subtopic.name}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Created {new Date(question.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <QuestionStemEditor
          question={isEditing ? editState.question : question.question}
          isEditing={isEditing}
          onChange={(value) => onEditStateChange({ question: value })}
        />

        <OptionsEditor
          options={isEditing ? editState.options : question.options}
          correctAnswer={isEditing ? editState.correctAnswer : question.correctAnswer}
          isEditing={isEditing}
          onOptionChange={(key, value) =>
            onEditStateChange({
              options: { ...editState.options, [key]: value },
            })
          }
          onCorrectAnswerChange={(key) =>
            onEditStateChange({ correctAnswer: key })
          }
        />

        <ExplanationEditor
          explanation={isEditing ? editState.explanation : question.explanation || ''}
          isEditing={isEditing}
          onChange={(value) => onEditStateChange({ explanation: value })}
        />

        <PrerequisiteInfo
          prerequisite={question.prerequisite}
          linkedConcepts={question.questionKnowledgePoints}
        />

        <SourceExamQuestion sourceExamQuestionId={question.sourceExamQuestionId} />
      </div>
    </div>
  );
}
