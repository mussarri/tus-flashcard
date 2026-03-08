'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Edit2, Save } from 'lucide-react';

interface ReviewActionsProps {
  isPending: boolean;
  isEditing: boolean;
  isApproveDisabled: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export function ReviewActions({
  isPending,
  isEditing,
  isApproveDisabled,
  onEdit,
  onSave,
  onCancel,
  onApprove,
  onReject,
}: ReviewActionsProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = () => {
    onReject(rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
  };

  if (!isPending) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        {!isEditing ? (
          <>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={onApprove}
              disabled={isApproveDisabled}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 m-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Reject Question
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this question:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 min-h-[100px] focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter rejection reason..."
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
