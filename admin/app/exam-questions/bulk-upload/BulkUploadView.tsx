/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { api } from '../../../lib/api';
import { FileText, CheckCircle2, XCircle, AlertCircle, Upload, Play } from 'lucide-react';
import Link from 'next/link';

interface ParsedQuestion {
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string | null;
  rawText: string;
}

interface PreviewResult {
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  validQuestions: ParsedQuestion[];
  invalidQuestions: Array<{
    index: number;
    questionText: string;
    reason: string;
  }>;
}

interface SavedQuestion {
  id: string;
  question: string;
  lesson: string;
  analysisStatus: string;
}

export default function BulkUploadView() {
  const [text, setText] = useState('');
  const [lesson, setLesson] = useState('Anatomi');
  const [year, setYear] = useState(2025);
  const [examType, setExamType] = useState('');
  
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestion[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePreview = async () => {
    if (!text.trim()) {
      setError('Lütfen soru metnini girin');
      return;
    }

    setLoading(true);
    setError('');
    setPreviewResult(null);

    try {
      const response = await api.bulkUploadPreview({ text, lesson });
      setPreviewResult(response);
      setSuccess(`${response.validCount} geçerli soru bulundu`);
    } catch (err: any) {
      setError(err.message || 'Önizleme başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!previewResult || previewResult.validCount === 0) {
      setError('Önce soruları önizleyin');
      return;
    }

    setSaving(true);
    setError('');
    setSavedQuestions([]);

    try {
      const response = await api.bulkUploadSave({
        text,
        lesson,
        year,
        examType: examType || undefined,
      });
      
      setSavedQuestions(response.questions);
      setSuccess(`${response.savedCount} soru kaydedildi`);
      
      // Clear form
      setText('');
      setPreviewResult(null);
    } catch (err: any) {
      setError(err.message || 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (savedQuestions.length === 0) {
      setError('Analiz edilecek soru yok');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      const questionIds = savedQuestions.map(q => q.id);
      const response = await api.bulkAnalyze({ questionIds });
      
      setSuccess(`${response.queuedCount} soru analiz kuyruğuna eklendi`);
    } catch (err: any) {
      setError(err.message || 'Analiz başarısız');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Toplu Soru Yükleme</h1>
          <p className="text-gray-600 mt-2">Metin formatında birden fazla soru yükleyin</p>
        </div>
        <Link
          href="/exam-questions"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          ← Sorulara Dön
        </Link>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <XCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Lesson Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ders <span className="text-red-500">*</span>
            </label>
            <select
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Anatomi">Anatomi</option>
              <option value="Fizyoloji">Fizyoloji</option>
              <option value="Farmakoloji">Farmakoloji</option>
              <option value="Dahiliye">Dahiliye</option>
              <option value="Patoloji">Patoloji</option>
              <option value="Biyokimya">Biyokimya</option>
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yıl <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Exam Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sınav Türü (Opsiyonel)
            </label>
            <input
              type="text"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              placeholder="TUS-1, TUS-2, vb."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Text Area */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Soru Metni <span className="text-red-500">*</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Soruları buraya yapıştırın. Desteklenen ayırıcılar:
- ### SORU
- ---
- İki veya daha fazla satır boşluğu

Örnek format:
### SORU
Soru metni buraya...
A) Seçenek A
B) Seçenek B
C) Seçenek C
D) Seçenek D
E) Seçenek E
Doğru Cevap: C

### SORU
Başka bir soru...`}
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            disabled={loading || !text.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            {loading ? 'Önizleniyor...' : 'Önizle'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !previewResult || previewResult.validCount === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || savedQuestions.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            {analyzing ? 'Analiz Ediliyor...' : 'Analiz Et'}
          </button>
        </div>
      </div>

      {/* Preview Result */}
      {previewResult && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Önizleme Sonucu</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="text-2xl font-bold text-blue-900">{previewResult.totalParsed}</div>
              <div className="text-sm text-blue-700">Toplam Blok</div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <div className="text-2xl font-bold text-green-900">{previewResult.validCount}</div>
              <div className="text-sm text-green-700">Geçerli Soru</div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <div className="text-2xl font-bold text-red-900">{previewResult.invalidCount}</div>
              <div className="text-sm text-red-700">Geçersiz Soru</div>
            </div>
          </div>

          {/* Valid Questions Preview */}
          {previewResult.validQuestions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Geçerli Sorular (İlk 3)</h3>
              <div className="space-y-3">
                {previewResult.validQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded">
                    <div className="text-sm text-gray-600 mb-1">Soru {idx + 1}</div>
                    <div className="text-sm font-mono whitespace-pre-wrap text-gray-900">
                      {q.questionText.substring(0, 200)}
                      {q.questionText.length > 200 && '...'}
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      Seçenekler: {Object.keys(q.options).join(', ')} | 
                      Doğru Cevap: {q.correctAnswer || 'Belirtilmemiş'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invalid Questions */}
          {previewResult.invalidQuestions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Geçersiz Sorular
              </h3>
              <div className="space-y-2">
                {previewResult.invalidQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="text-sm font-semibold text-red-900">Blok {q.index}</div>
                    <div className="text-sm text-red-700 mb-1">Sebep: {q.reason}</div>
                    <div className="text-xs font-mono text-gray-600 truncate">
                      {q.questionText}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Questions */}
      {savedQuestions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Kaydedilen Sorular</h2>
          <div className="space-y-2">
            {savedQuestions.map((q) => (
              <Link
                key={q.id}
                href={`/exam-questions/${q.id}`}
                className="block p-3 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 truncate text-sm text-gray-900">
                    {q.question.substring(0, 100)}...
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                      {q.analysisStatus}
                    </span>
                    <span className="text-blue-600 text-sm">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Format Help */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Format Yardımı</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Sorular &quot;### SORU&quot;, &quot;---&quot; veya çift satır boşluğu ile ayrılmalıdır</li>
          <li>• Her soru minimum 5 seçenek (A-E) içermelidir</li>
          <li>• Doğru cevap opsiyoneldir (örn: &quot;Doğru Cevap: C&quot;)</li>
          <li>• Sorular RAW (ham) durumda kaydedilir ve analiz edilmez</li>
          <li>• &quot;Kaydet&quot; butonuna bastıktan sonra &quot;Analiz Et&quot; ile AI analizini başlatabilirsiniz</li>
        </ul>
      </div>
    </div>
  );
}
