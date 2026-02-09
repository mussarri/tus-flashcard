'use client';

import { useState } from 'react';
import ClassificationView from './ClassificationView';
import {
  FileText,
  CheckCircle,
  Brain,
  CreditCard,
  HelpCircle,
  Activity,
  AlertCircle,
  Lock,
} from 'lucide-react';

interface Batch {
  id: string;
  topic: string;
  description?: string;
  status: string;
  pages: any[];
}

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  reason?: string;
}

interface BatchDetailClientProps {
  batch: Batch;
  approvedContent: any[];
  knowledgePoints: any[];
  flashcards: any[];
  questions: any[];
}

export default function BatchDetailClient({
  batch,
  approvedContent,
  knowledgePoints,
  flashcards,
  questions,
}: BatchDetailClientProps) {
  const [activeTab, setActiveTab] = useState('pages');

  // Determine tab availability based on pipeline stage
  const getTabs = (): Tab[] => {
    const hasApprovedContent = approvedContent.length > 0;
    const hasKnowledgePoints = knowledgePoints.length > 0;
    const hasFlashcards = flashcards.length > 0;

    return [
      {
        id: 'pages',
        label: 'Pages / Parsed Blocks',
        icon: FileText,
        enabled: true,
      },
      {
        id: 'approved',
        label: 'Approved Content',
        icon: CheckCircle,
        enabled: hasApprovedContent,
        reason: hasApprovedContent
          ? undefined
          : 'No approved content yet. Approve blocks in the Pages tab first.',
      },
      {
        id: 'knowledge',
        label: 'Knowledge',
        icon: Brain,
        enabled: hasKnowledgePoints,
        reason: hasKnowledgePoints
          ? undefined
          : 'No knowledge points extracted yet. Extract knowledge from approved content first.',
      },
      {
        id: 'flashcards',
        label: 'Flashcards',
        icon: CreditCard,
        enabled: hasFlashcards,
        reason: hasFlashcards
          ? undefined
          : 'No flashcards generated yet. Generate flashcards from topics page.',
      },
      {
        id: 'questions',
        label: 'Questions',
        icon: HelpCircle,
        enabled: questions.length > 0,
        reason: questions.length > 0
          ? undefined
          : 'No questions generated yet. Generate questions from topics page.',
      },
      {
        id: 'logs',
        label: 'Logs',
        icon: Activity,
        enabled: true,
      },
    ];
  };

  const tabs = getTabs();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pages':
        return <PagesTab batch={batch} />;
      case 'approved':
        return <ApprovedContentTab batch={batch} approvedContent={approvedContent} />;
      case 'knowledge':
        return <KnowledgeTab batch={batch} knowledgePoints={knowledgePoints} />;
      case 'flashcards':
        return <FlashcardsTab flashcards={flashcards} />;
      case 'questions':
        return <QuestionsTab questions={questions} />;
      case 'logs':
        return <LogsTab batchId={batch.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{batch.topic}</h1>
        {batch.description && (
          <p className="text-gray-600 mt-2">{batch.description}</p>
        )}
        <div className="mt-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded">
            {batch.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => tab.enabled && setActiveTab(tab.id)}
                disabled={!tab.enabled}
                className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${!tab.enabled
                    ? 'text-gray-400 cursor-not-allowed border-transparent'
                    : isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  `}
                title={tab.reason}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {!tab.enabled && <Lock className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  );
}

// Tab Components
function PagesTab({ batch }: { batch: Batch }) {
  return <ClassificationView batchId={batch.id} />;
}

function ApprovedContentTab({
  batch,
  approvedContent,
}: {
  batch: Batch;
  approvedContent: any[];
}) {
  return (
    <div>
      <p className="text-gray-600 mb-4">
        Content approved for knowledge extraction. This is step 2 of the pipeline.
      </p>
      {approvedContent.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No approved content yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvedContent.map((content) => (
            <div key={content.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-900">{content.content?.substring(0, 200)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeTab({ batch, knowledgePoints }: { batch: Batch; knowledgePoints: any[] }) {
  return (
    <div>
      <p className="text-gray-600 mb-4">
        Knowledge points extracted from approved content. This is step 3 of the pipeline.
      </p>
      {knowledgePoints.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No knowledge points extracted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {knowledgePoints.map((kp) => (
            <div key={kp.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900">{kp.fact}</p>
              {kp.category && (
                <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {kp.category}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlashcardsTab({ flashcards }: { flashcards: any[] }) {
  return (
    <div>
      <p className="text-gray-600 mb-4">Flashcards generated from knowledge points.</p>
      {flashcards.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No flashcards generated yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flashcards.map((fc) => (
            <div key={fc.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  {fc.cardType}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">{fc.front}</p>
              <p className="text-sm text-gray-600 mt-1">{fc.back}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionsTab({ questions }: { questions: any[] }) {
  return (
    <div>
      <p className="text-gray-600 mb-4">Questions generated from knowledge points.</p>
      {questions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No questions generated yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900">{q.question}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogsTab({ batchId }: { batchId: string }) {
  return (
    <div>
      <p className="text-gray-600 mb-4">Activity log for this batch.</p>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">Logs will be displayed here.</p>
      </div>
    </div>
  );
}
