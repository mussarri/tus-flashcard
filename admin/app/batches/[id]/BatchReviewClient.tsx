'use client';

import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Block {
    id: string;
    blockType: string;
    blockIndex: number;
    rawText: string | null;
    editedText: string | null;
    approvalStatus: string;
    confidence: number | null;
}

interface Page {
    id: string;
    pageNumber: number;
    originalName: string;
    filePath: string;
    blocks: Block[];
}

interface Batch {
    id: string;
    topic: string;
    description?: string;
    status: string;
    pages: Page[];
}

export default function BatchReviewClient({ batch }: { batch: Batch }) {
    const router = useRouter();
    const [editingBlock, setEditingBlock] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [loading, setLoading] = useState<string | null>(null);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isEditingBatch, setIsEditingBatch] = useState(false);
    const [batchTopic, setBatchTopic] = useState(batch.topic);
    const [batchDescription, setBatchDescription] = useState(batch.description || '');
    const [batchSaving, setBatchSaving] = useState(false);
    const [batchDeleting, setBatchDeleting] = useState(false);

    // Manual block creation state
    const [creatingManualBlock, setCreatingManualBlock] = useState<string | null>(null); // pageId
    const [manualBlockText, setManualBlockText] = useState('');
    const [manualContentType, setManualContentType] = useState('TOPIC_EXPLANATION');
    const [manualLesson, setManualLesson] = useState('');
    const [manualTopic, setManualTopic] = useState('');
    const [manualSubtopic, setManualSubtopic] = useState('');
    const [creatingBlockLoading, setCreatingBlockLoading] = useState(false);

    // Knowledge extraction state
    const [approvedBlocks, setApprovedBlocks] = useState<any[]>([]);
    const [loadingApprovedBlocks, setLoadingApprovedBlocks] = useState(false);
    const [extractingContent, setExtractingContent] = useState<string | null>(null);
    const [extractingBatch, setExtractingBatch] = useState(false);

    // Knowledge points state
    const [knowledgePoints, setKnowledgePoints] = useState<any[]>([]);
    const [loadingKnowledgePoints, setLoadingKnowledgePoints] = useState(false);
    const [expandedContentId, setExpandedContentId] = useState<string | null>(null);

    // Flashcards and Questions state
    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [loadingFlashcards, setLoadingFlashcards] = useState(false);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [showFlashcards, setShowFlashcards] = useState(false);
    const [showQuestions, setShowQuestions] = useState(false);

    const handleApprove = async (blockId: string, text?: string) => {
        setLoading(blockId);
        try {
            await api.approveBlock(blockId, text ? { editedText: text } : undefined);
            router.refresh();
        } catch (error) {
            alert('Failed to approve block');
        } finally {
            setLoading(null);
        }
    };

    const handleReject = async (blockId: string) => {
        if (!confirm('Are you sure you want to reject this block?')) return;
        setLoading(blockId);
        try {
            await api.rejectBlock(blockId);
            router.refresh();
        } catch (error) {
            alert('Failed to reject block');
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async (blockId: string) => {
        if (!confirm('Are you sure you want to delete this block?')) return;
        setLoading(blockId);
        try {
            await api.deleteBlock(blockId);
            router.refresh();
        } catch (error) {
            alert('Failed to delete block');
        } finally {
            setLoading(null);
        }
    };

    const handleBatchSave = async () => {
        const trimmedTopic = batchTopic.trim();
        const trimmedDescription = batchDescription.trim();

        if (!trimmedTopic) {
            alert('Topic is required');
            return;
        }

        setBatchSaving(true);
        try {
            const response = await api.updateBatch(batch.id, {
                topic: trimmedTopic,
                description: trimmedDescription || undefined,
            });
            if (response?.batch) {
                setBatchTopic(response.batch.topic);
                setBatchDescription(response.batch.description || '');
            }
            setIsEditingBatch(false);
            router.refresh();
        } catch (error) {
            alert('Failed to update batch');
        } finally {
            setBatchSaving(false);
        }
    };

    const handleBatchDelete = async () => {
        if (!confirm('Are you sure you want to delete this batch? This cannot be undone.')) return;
        setBatchDeleting(true);
        try {
            await api.deleteBatch(batch.id);
            router.push('/batches');
            router.refresh();
        } catch (error) {
            alert('Failed to delete batch');
        } finally {
            setBatchDeleting(false);
        }
    };

    const startEdit = (block: Block) => {
        setEditingBlock(block.id);
        setEditText(block.editedText || block.rawText || '');
    };

    const cancelEdit = () => {
        setEditingBlock(null);
        setEditText('');
    };

    const saveEdit = async (blockId: string) => {
        await handleApprove(blockId, editText);
        setEditingBlock(null);
        setEditText('');
    };

    const handleCreateManualBlock = async (pageId: string) => {
        if (!manualBlockText.trim()) {
            alert('Text is required');
            return;
        }

        setCreatingBlockLoading(true);
        try {
            await api.createManualBlock(pageId, {
                rawText: manualBlockText.trim(),
                contentType: manualContentType,
                lesson: manualLesson.trim() || undefined,
                topic: manualTopic.trim() || undefined,
                subtopic: manualSubtopic.trim() || undefined,
            });

            // Reset form
            setCreatingManualBlock(null);
            setManualBlockText('');
            setManualContentType('TOPIC_EXPLANATION');
            setManualLesson('');
            setManualTopic('');
            setManualSubtopic('');

            router.refresh();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to create manual block');
        } finally {
            setCreatingBlockLoading(false);
        }
    };

    const loadApprovedBlocks = async () => {
        setLoadingApprovedBlocks(true);
        try {
            const response = await api.getApprovedBlocks(batch.id);
            if (response.success) {
                setApprovedBlocks(response.approvedBlocks || []);
            }
        } catch (error) {
            console.error('Failed to load approved blocks:', error);
        } finally {
            setLoadingApprovedBlocks(false);
        }
    };

    const handleExtractKnowledgeForContent = async (approvedContentId: string) => {
        setExtractingContent(approvedContentId);
        try {
            const response = await api.extractKnowledgeForContent(approvedContentId);
            if (response.success) {
                alert(`Knowledge extraction queued successfully! Job ID: ${response.jobId || 'N/A'}`);
                loadApprovedBlocks(); // Refresh list
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to trigger knowledge extraction');
        } finally {
            setExtractingContent(null);
        }
    };

    const handleExtractKnowledgeForBatch = async () => {
        if (!confirm('Extract knowledge for all approved content in this batch?')) return;
        setExtractingBatch(true);
        try {
            const response = await api.extractKnowledgeForBatch(batch.id);
            if (response.success) {
                alert(`Knowledge extraction queued for ${response.queued} content(s). Skipped: ${response.skipped}`);
                loadApprovedBlocks(); // Refresh list
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to trigger knowledge extraction');
        } finally {
            setExtractingBatch(false);
        }
    };

    const loadKnowledgePoints = async () => {
        setLoadingKnowledgePoints(true);
        try {
            const response = await api.getKnowledgePointsForBatch(batch.id);
            if (response.success) {
                setKnowledgePoints(response.knowledgePoints || []);
            }
        } catch (error) {
            console.error('Failed to load knowledge points:', error);
        } finally {
            setLoadingKnowledgePoints(false);
        }
    };

    const loadKnowledgePointsForContent = async (approvedContentId: string) => {
        try {
            const response = await api.getKnowledgePointsForContent(approvedContentId);
            if (response.success) {
                // Update knowledge points in state, merging with existing
                setKnowledgePoints((prev) => {
                    const existing = prev.filter((kp) => kp.approvedContentId !== approvedContentId);
                    return [...existing, ...(response.knowledgePoints || [])];
                });
            }
        } catch (error) {
            console.error('Failed to load knowledge points for content:', error);
        }
    };

    const loadFlashcards = async () => {
        setLoadingFlashcards(true);
        try {
            const response = await api.getFlashcardsForBatch(batch.id);
            if (response.success) {
                setFlashcards(response.flashcards || []);
            }
        } catch (error) {
            console.error('Failed to load flashcards:', error);
        } finally {
            setLoadingFlashcards(false);
        }
    };

    const loadQuestions = async () => {
        setLoadingQuestions(true);
        try {
            const response = await api.getQuestionsForBatch(batch.id);
            if (response.success) {
                setQuestions(response.questions || []);
            }
        } catch (error) {
            console.error('Failed to load questions:', error);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png'],
            'application/pdf': ['.pdf'],
        },
        maxSize: 10 * 1024 * 1024, // 10MB
        onDrop: async (acceptedFiles) => {
            if (acceptedFiles.length === 0) return;

            try {
                setUploadingFiles(true);
                setUploadError(null);

                const formData = new FormData();
                acceptedFiles.forEach((file) => {
                    formData.append('files', file);
                });

                const response = await api.addPagesToBatch(batch.id, formData);

                if (response.success) {
                    router.refresh();
                } else {
                    setUploadError(response.error || 'Failed to upload files');
                }
            } catch (error) {
                setUploadError(error instanceof Error ? error.message : 'Failed to upload files');
            } finally {
                setUploadingFiles(false);
            }
        },
        disabled: uploadingFiles,
    });

    // Load approved blocks and knowledge points on mount
    useEffect(() => {
        loadApprovedBlocks();
        loadKnowledgePoints();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batch.id]);

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{batchTopic}</h1>
                            <p className="text-gray-800 font-medium">
                                Status: <span className="font-semibold">{batch.status}</span>
                            </p>
                            {batchDescription && (
                                <p className="text-gray-800 mt-1">{batchDescription}</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditingBatch((prev) => !prev)}
                                className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                                {isEditingBatch ? 'Close' : 'Edit Batch'}
                            </button>
                            <button
                                onClick={handleExtractKnowledgeForBatch}
                                disabled={extractingBatch || approvedBlocks.length === 0}
                                className="px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:bg-gray-400"
                            >
                                {extractingBatch ? 'Extracting...' : `Extract Knowledge (${approvedBlocks.length})`}
                            </button>
                            <button
                                onClick={handleBatchDelete}
                                disabled={batchDeleting}
                                className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400"
                            >
                                {batchDeleting ? 'Deleting...' : 'Delete Batch'}
                            </button>
                        </div>
                    </div>

                    {isEditingBatch && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">
                                    Topic
                                </label>
                                <input
                                    type="text"
                                    value={batchTopic}
                                    onChange={(e) => setBatchTopic(e.target.value)}
                                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={batchDescription}
                                    onChange={(e) => setBatchDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleBatchSave}
                                    disabled={batchSaving}
                                    className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                                >
                                    {batchSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={() => {
                                        setBatchTopic(batch.topic);
                                        setBatchDescription(batch.description || '');
                                        setIsEditingBatch(false);
                                    }}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Dosya Ekleme Alanı */}
                    <div className="mt-6">
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                isDragActive
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-gray-400'
                            } ${uploadingFiles ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <input {...getInputProps()} />
                            {uploadingFiles ? (
                                <div className="text-gray-800">
                                    <p className="font-semibold">Dosyalar yükleniyor...</p>
                                </div>
                            ) : (
                                <div className="text-gray-800">
                                    <p className="font-semibold mb-2">
                                        {isDragActive
                                            ? 'Dosyaları buraya bırakın'
                                            : 'Dosya eklemek için tıklayın veya sürükleyin'}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        PDF, JPG, PNG (Max 10MB)
                                    </p>
                                </div>
                            )}
                        </div>
                        {uploadError && (
                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                                {uploadError}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    {batch.pages.map((page) => (
                        <div key={page.id} className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">
                                    Page {page.pageNumber}: {page.originalName}
                                </h2>
                                <button
                                    onClick={() => setCreatingManualBlock(
                                        creatingManualBlock === page.id ? null : page.id
                                    )}
                                    className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                >
                                    {creatingManualBlock === page.id ? 'Cancel' : '+ Add Manual Block'}
                                </button>
                            </div>

                            {/* Manual Block Creation Form */}
                            {creatingManualBlock === page.id && (
                                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                                    <h3 className="font-semibold text-gray-900">Create Manual Block</h3>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-1">
                                            Content Type *
                                        </label>
                                        <select
                                            value={manualContentType}
                                            onChange={(e) => setManualContentType(e.target.value)}
                                            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="TOPIC_EXPLANATION">Topic Explanation</option>
                                            <option value="SPOT_FACT">Spot Fact</option>
                                            <option value="QUESTION_ONLY">Question Only</option>
                                            <option value="QUESTION_WITH_ANSWER">Question with Answer</option>
                                            <option value="EXPLANATION_ONLY">Explanation Only</option>
                                            <option value="MIXED_CONTENT">Mixed Content</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-1">
                                                Lesson
                                            </label>
                                            <input
                                                type="text"
                                                value={manualLesson}
                                                onChange={(e) => setManualLesson(e.target.value)}
                                                placeholder="e.g., Dahiliye"
                                                className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-1">
                                                Topic
                                            </label>
                                            <input
                                                type="text"
                                                value={manualTopic}
                                                onChange={(e) => setManualTopic(e.target.value)}
                                                placeholder="e.g., Diyabet"
                                                className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-1">
                                                Subtopic
                                            </label>
                                            <input
                                                type="text"
                                                value={manualSubtopic}
                                                onChange={(e) => setManualSubtopic(e.target.value)}
                                                placeholder="e.g., Tanı Kriterleri"
                                                className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-1">
                                            Block Text *
                                        </label>
                                        <textarea
                                            value={manualBlockText}
                                            onChange={(e) => setManualBlockText(e.target.value)}
                                            rows={6}
                                            placeholder="Enter the content for this block..."
                                            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleCreateManualBlock(page.id)}
                                            disabled={creatingBlockLoading || !manualBlockText.trim()}
                                            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {creatingBlockLoading ? 'Creating...' : 'Create Block'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setCreatingManualBlock(null);
                                                setManualBlockText('');
                                                setManualContentType('TOPIC_EXPLANATION');
                                                setManualLesson('');
                                                setManualTopic('');
                                                setManualSubtopic('');
                                            }}
                                            disabled={creatingBlockLoading}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {page.blocks.length === 0 ? (
                                <p className="text-gray-500 text-sm">No blocks parsed yet</p>
                            ) : (
                                <div className="space-y-4">
                                    {page.blocks.map((block) => (
                                        <div
                                            key={block.id}
                                            className="border border-gray-200 rounded-lg p-4"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-900 text-xs font-semibold rounded">
                                                        {block.blockType}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        Block #{block.blockIndex + 1}
                                                    </span>
                                                    {block.confidence && (
                                                        <span className="text-xs font-medium text-gray-600">
                                                            Confidence: {(block.confidence * 100).toFixed(1)}%
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    className={`px-2 py-1 text-xs rounded ${block.approvalStatus === 'APPROVED'
                                                        ? 'bg-green-100 text-green-800'
                                                        : block.approvalStatus === 'REJECTED'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                >
                                                    {block.approvalStatus}
                                                </span>
                                            </div>

                                            {editingBlock === block.id ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        rows={6}
                                                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => saveEdit(block.id)}
                                                            disabled={loading === block.id}
                                                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                                                        >
                                                            Save & Approve
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-gray-900 whitespace-pre-wrap font-medium">
                                                        {block.editedText || block.rawText || 'No content'}
                                                    </p>
                                                    {block.approvalStatus === 'PENDING' && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleApprove(block.id)}
                                                                disabled={loading === block.id}
                                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => startEdit(block)}
                                                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(block.id)}
                                                                disabled={loading === block.id}
                                                                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:bg-gray-400"
                                                            >
                                                                Reject
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(block.id)}
                                                                disabled={loading === block.id}
                                                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Approved Content & Knowledge Extraction Section */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Approved Content & Knowledge Extraction</h2>
                        <button
                            onClick={loadApprovedBlocks}
                            disabled={loadingApprovedBlocks}
                            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100"
                        >
                            {loadingApprovedBlocks ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>

                    {approvedBlocks.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">
                            No approved content yet. Approve blocks above to start knowledge extraction.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {approvedBlocks.map((approvedContent: any) => {
                                const statusColors: Record<string, string> = {
                                    NOT_STARTED: 'bg-gray-100 text-gray-800',
                                    QUEUED: 'bg-yellow-100 text-yellow-800',
                                    PROCESSING: 'bg-blue-100 text-blue-800',
                                    COMPLETED: 'bg-green-100 text-green-800',
                                    FAILED: 'bg-red-100 text-red-800',
                                };

                                const canExtract = approvedContent.extractionStatus === 'NOT_STARTED' || 
                                                   approvedContent.extractionStatus === 'FAILED';

                                return (
                                    <div key={approvedContent.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        Block: {approvedContent.blockId.substring(0, 8)}...
                                                    </span>
                                                    <span className={`px-2 py-1 text-xs rounded ${statusColors[approvedContent.extractionStatus] || statusColors.NOT_STARTED}`}>
                                                        {approvedContent.extractionStatus}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 line-clamp-2">
                                                    {approvedContent.content?.substring(0, 200)}...
                                                </p>
                                                {approvedContent.extractedAt && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Extracted: {new Date(approvedContent.extractedAt).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                {canExtract ? (
                                                    <button
                                                        onClick={() => handleExtractKnowledgeForContent(approvedContent.id)}
                                                        disabled={extractingContent === approvedContent.id}
                                                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:bg-gray-400"
                                                    >
                                                        {extractingContent === approvedContent.id ? 'Queuing...' : 'Extract Knowledge'}
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                if (expandedContentId === approvedContent.id) {
                                                                    setExpandedContentId(null);
                                                                } else {
                                                                    setExpandedContentId(approvedContent.id);
                                                                    loadKnowledgePointsForContent(approvedContent.id);
                                                                }
                                                            }}
                                                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                                        >
                                                            {expandedContentId === approvedContent.id ? 'Hide' : 'View'} Knowledge Points
                                                        </button>
                                                        <span className="text-xs text-gray-500 flex items-center">
                                                            {approvedContent.extractionStatus === 'PROCESSING' && 'Processing...'}
                                                            {approvedContent.extractionStatus === 'QUEUED' && 'Queued'}
                                                            {approvedContent.extractionStatus === 'COMPLETED' && 'Completed'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Knowledge Points for this content */}
                                        {expandedContentId === approvedContent.id && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Knowledge Points</h4>
                                                {knowledgePoints
                                                    .filter((kp) => kp.approvedContentId === approvedContent.id)
                                                    .length === 0 ? (
                                                    <p className="text-sm text-gray-500">No knowledge points extracted yet.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {knowledgePoints
                                                            .filter((kp) => kp.approvedContentId === approvedContent.id)
                                                            .map((kp: any) => (
                                                                <div key={kp.id} className="bg-gray-50 rounded p-3 border border-gray-200">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <div className="flex-1">
                                                                            <p className="text-sm font-medium text-gray-900 mb-1">
                                                                                {kp.fact}
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-2 text-xs">
                                                                                {kp.category && (
                                                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                                                                        {kp.category}
                                                                                    </span>
                                                                                )}
                                                                                {kp.subcategory && (
                                                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                                                                        {kp.subcategory}
                                                                                    </span>
                                                                                )}
                                                                                {kp.priority > 0 && (
                                                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                                                                        Priority: {kp.priority}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Created: {new Date(kp.createdAt).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* All Knowledge Points Section */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">All Knowledge Points</h2>
                        <button
                            onClick={loadKnowledgePoints}
                            disabled={loadingKnowledgePoints}
                            className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100"
                        >
                            {loadingKnowledgePoints ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>

                    {knowledgePoints.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">
                            No knowledge points yet. Extract knowledge from approved content above.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {knowledgePoints.map((kp: any) => (
                                <div key={kp.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900 mb-2">{kp.fact}</p>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {kp.category && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                                        {kp.category}
                                                    </span>
                                                )}
                                                {kp.subcategory && (
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                                        {kp.subcategory}
                                                    </span>
                                                )}
                                                {kp.priority > 0 && (
                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                                        Priority: {kp.priority}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                From: {kp.approvedContent?.block?.page?.originalName || 'Unknown'} • 
                                                Created: {new Date(kp.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Flashcards Section */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Flashcards</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowFlashcards(!showFlashcards);
                                    if (!showFlashcards && flashcards.length === 0) {
                                        loadFlashcards();
                                    }
                                }}
                                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                            >
                                {showFlashcards ? 'Hide' : 'Show'} Flashcards
                            </button>
                            {showFlashcards && (
                                <button
                                    onClick={loadFlashcards}
                                    disabled={loadingFlashcards}
                                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100"
                                >
                                    {loadingFlashcards ? 'Loading...' : 'Refresh'}
                                </button>
                            )}
                        </div>
                    </div>

                    {showFlashcards && (
                        <>
                            {loadingFlashcards ? (
                                <p className="text-gray-600 text-center py-8">Loading flashcards...</p>
                            ) : flashcards.length === 0 ? (
                                <p className="text-gray-600 text-center py-8">
                                    No flashcards found. Generate flashcards from topics page.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-sm text-gray-600 mb-2">
                                        Total: {flashcards.length} flashcard{flashcards.length !== 1 ? 's' : ''}
                                    </div>
                                    {flashcards.map((flashcard: any) => (
                                        <div key={flashcard.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 text-xs rounded ${
                                                        flashcard.cardType === 'SPOT' ? 'bg-blue-100 text-blue-800' :
                                                        flashcard.cardType === 'TRAP' ? 'bg-red-100 text-red-800' :
                                                        flashcard.cardType === 'CLINICAL_TIP' ? 'bg-green-100 text-green-800' :
                                                        'bg-purple-100 text-purple-800'
                                                    }`}>
                                                        {flashcard.cardType}
                                                    </span>
                                                    <span className={`px-2 py-1 text-xs rounded ${
                                                        flashcard.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                        flashcard.approvalStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {flashcard.approvalStatus}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 mb-1">Front</p>
                                                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                                        {flashcard.front}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-500 mb-1">Back</p>
                                                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                                        {flashcard.back}
                                                    </p>
                                                </div>
                                            </div>
                                            {flashcard.knowledgePoint && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    From: {flashcard.knowledgePoint.fact?.substring(0, 100)}...
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Questions Section */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Generated Questions</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowQuestions(!showQuestions);
                                    if (!showQuestions && questions.length === 0) {
                                        loadQuestions();
                                    }
                                }}
                                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                            >
                                {showQuestions ? 'Hide' : 'Show'} Questions
                            </button>
                            {showQuestions && (
                                <button
                                    onClick={loadQuestions}
                                    disabled={loadingQuestions}
                                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 disabled:bg-gray-100"
                                >
                                    {loadingQuestions ? 'Loading...' : 'Refresh'}
                                </button>
                            )}
                        </div>
                    </div>

                    {showQuestions && (
                        <>
                            {loadingQuestions ? (
                                <p className="text-gray-600 text-center py-8">Loading questions...</p>
                            ) : questions.length === 0 ? (
                                <p className="text-gray-600 text-center py-8">
                                    No questions found. Generate questions from topics page.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-sm text-gray-600 mb-2">
                                        Total: {questions.length} question{questions.length !== 1 ? 's' : ''}
                                    </div>
                                    {questions.map((question: any) => {
                                        const options = typeof question.options === 'string' 
                                            ? JSON.parse(question.options) 
                                            : question.options;
                                        
                                        return (
                                            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        {question.scenarioType && (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                                {question.scenarioType}
                                                            </span>
                                                        )}
                                                        <span className={`px-2 py-1 text-xs rounded ${
                                                            question.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                            question.approvalStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {question.approvalStatus}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <p className="text-sm font-semibold text-gray-900 mb-2">
                                                        {question.question}
                                                    </p>
                                                    <div className="space-y-1">
                                                        {['A', 'B', 'C', 'D', 'E'].map((option) => {
                                                            const optionText = options[option];
                                                            if (!optionText) return null;
                                                            const isCorrect = question.correctAnswer === option;
                                                            return (
                                                                <div
                                                                    key={option}
                                                                    className={`p-2 rounded text-sm ${
                                                                        isCorrect
                                                                            ? 'bg-green-50 border border-green-200'
                                                                            : 'bg-gray-50 border border-gray-200'
                                                                    }`}
                                                                >
                                                                    <span className="font-semibold">{option}.</span>{' '}
                                                                    {optionText}
                                                                    {isCorrect && (
                                                                        <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                {question.explanation && (
                                                    <div className="mt-3 p-3 bg-blue-50 rounded">
                                                        <p className="text-xs font-semibold text-gray-700 mb-1">Explanation:</p>
                                                        <p className="text-sm text-gray-800">{question.explanation}</p>
                                                    </div>
                                                )}
                                                {question.questionKnowledgePoints && question.questionKnowledgePoints.length > 0 && (
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Knowledge Points: {question.questionKnowledgePoints.length}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
