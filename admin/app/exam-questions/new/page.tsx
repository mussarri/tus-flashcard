'use client';

import { useState } from 'react';
import { api } from '../../../lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewExamQuestionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    examType: '',
    questionNumber: '',
    questionWithOptions: '',
    correctAnswer: 'A',
    explanation: '',
  });

  const parseQuestionAndOptions = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const options: Record<string, string> = {};
    let question = '';
    
    // Find where options start (first line with A), B), C), D), or E))
    const optionStartIndex = lines.findIndex(line => 
      /^[A-E]\)/.test(line.trim())
    );
    
    if (optionStartIndex === -1) {
      // No options found, treat entire text as question
      return { question: text.trim(), options };
    }
    
    // Everything before options is the question
    question = lines.slice(0, optionStartIndex).join('\n').trim();
    
    // Parse options
    for (let i = optionStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(/^([A-E])\)\s*(.+)$/);
      if (match) {
        options[match[1]] = match[2].trim();
      }
    }
    
    return { question, options };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { question, options } = parseQuestionAndOptions(formData.questionWithOptions);
      
      if (Object.keys(options).length < 2) {
        alert('Please provide at least 2 options (A and B)');
        setLoading(false);
        return;
      }

      const response = await api.createExamQuestion({
        year: formData.year,
        examType: formData.examType || undefined,
        questionNumber: formData.questionNumber ? parseInt(formData.questionNumber) : undefined,
        question,
        options,
        correctAnswer: formData.correctAnswer,
        explanation: formData.explanation || undefined,
      });

      router.push(`/exam-questions/${response.examQuestion.id}`);
    } catch (error) {
      console.error('Failed to create exam question:', error);
      alert('Failed to create exam question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/exam-questions"
          className="p-2 hover:bg-gray-100 rounded"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Exam Question</h1>
          <p className="text-gray-600 mt-2">Create a new TUS exam question</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Type
            </label>
            <input
              type="text"
              value={formData.examType}
              onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="TUS-1, TUS-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Number
            </label>
            <input
              type="number"
              value={formData.questionNumber}
              onChange={(e) => setFormData({ ...formData, questionNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question with Options <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Enter the question followed by options in the format: A) option text, B) option text, etc.
          </p>
          <textarea
            required
            value={formData.questionWithOptions}
            onChange={(e) => setFormData({ ...formData, questionWithOptions: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            rows={12}
            placeholder={`45 yaşında erkek hasta, son 3 aydır artan halsizlik ve yorgunluk şikayeti ile başvurdu...

A) Demir eksikliği anemisi
B) Vitamin B12 eksikliği
C) Folat eksikliği
D) Talasemi
E) Kronik böbrek yetmezliği`}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Correct Answer <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.correctAnswer}
            onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="E">E</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Explanation
          </label>
          <textarea
            value={formData.explanation}
            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            rows={4}
            placeholder="Enter explanation (optional)..."
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/exam-questions"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Question'}
          </button>
        </div>
      </form>
    </div>
  );
}
