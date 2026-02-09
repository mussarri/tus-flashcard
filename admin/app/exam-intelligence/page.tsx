import { Suspense } from 'react';
import ExamIntelligenceView from './ExamIntelligenceView';

export const metadata = {
  title: 'Exam Intelligence Report | TUS Admin',
  description: 'Strategic intelligence report for TUS Anatomy exam patterns',
};

export default async function ExamIntelligencePage() {
  // Fetch the intelligence report on the server
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
  
  let report = null;
  let error = null;

  try {
    const response = await fetch(
      `${backendUrl}/admin/exam-intelligence/report?lesson=Anatomi`,
      {
        cache: 'no-store',
      }
    );    

    if (!response.ok) {
      throw new Error(`Failed to fetch report: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(data.report);
    
    report = data.report;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to fetch exam intelligence report:', err);
  }

  return (
    <div className="container mx-auto p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Analyzing exam patterns...</p>
            </div>
          </div>
        }
      >
        <ExamIntelligenceView
          initialReport={report}
          error={error}
          backendUrl={backendUrl}
        />
      </Suspense>
    </div>
  );
}
