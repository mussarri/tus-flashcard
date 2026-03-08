/* eslint-disable @typescript-eslint/no-explicit-any */
import { serverFetch } from '../../lib/api';
import DashboardView from './DashboardView';

interface WorkQueueCard {
  title: string;
  description: string;
  count: number;
  href: string;
  icon: string;
  color: string;
}

export default async function AdminDashboard() {
  try {
    // Fetch batches awaiting review
    const batchesResponse = await serverFetch<{ success: boolean; batches: any[] }>(
      'api/upload/batches'
    );
    const batches = batchesResponse.batches || [];
    const batchesAwaitingReview = batches.filter(
      (b: any) => b.status === 'REVIEWED' || b.status === 'CLASSIFIED',
    ).length;

    // Fetch approved content awaiting extraction
    // TODO: Implement API endpoint for this
    const contentAwaitingExtraction = 0;

    // Fetch topics without flashcards
    const topicsResponse = await serverFetch<{ 
      success: boolean; 
      topics: Array<{ name: string; knowledgePointCount: number; category?: string }>;
      categories: Array<{ name: string; count: number }>;
      subcategories: Array<{ name: string; count: number; category?: string }>;
    }>('admin/topics');
    const topicsWithoutFlashcards = topicsResponse.topics?.filter(
      (t: any) => t.knowledgePointCount > 0,
    ).length || 0;

    // Fetch content awaiting approval
    // TODO: Implement API endpoint for this
    const contentAwaitingApproval = 0;

    // Fetch flashcards requiring visuals
    const flashcardsWithVisualResponse = await serverFetch<{ 
      success: boolean; 
      flashcards: any[] 
    }>('admin/flashcards?useVisual=true&visualStatus=REQUIRED').catch(() => ({
      success: false,
      flashcards: [],
    }));
    const visualRequiredCount = flashcardsWithVisualResponse.flashcards?.length || 0;

    const workQueue: WorkQueueCard[] = [
      {
        title: 'Batches Awaiting Review',
        description: 'Batches ready for content review and approval',
        count: batchesAwaitingReview,
        href: '/batches?status=REVIEWED',
        icon: 'FolderOpen',
        color: 'blue',
      },
      {
        title: 'Content Awaiting Approval',
        description: 'Parsed blocks waiting for editor approval',
        count: contentAwaitingApproval,
        href: '/content-review',
        icon: 'FileText',
        color: 'yellow',
      },
      {
        title: 'Approved Content Awaiting Extraction',
        description: 'Approved content ready for knowledge extraction',
        count: contentAwaitingExtraction,
        href: '/knowledge?status=pending',
        icon: 'Brain',
        color: 'purple',
      },
      {
        title: 'Topics Without Flashcards',
        description: 'Topics with knowledge points but no flashcards generated',
        count: topicsWithoutFlashcards,
        href: '/topics?hasFlashcards=false',
        icon: 'BookOpen',
        color: 'green',
      },
      {
        title: 'Visual Tasks',
        description: 'Flashcards requiring visual upload',
        count: visualRequiredCount,
        href: '/flashcards/visual-required',
        icon: 'Image',
        color: 'red',
      },
    ];

    return <DashboardView workQueue={workQueue} />;
  } catch (error) {
    console.error('Failed to fetch work queue:', error);
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load dashboard. Please try again later.</p>
        </div>
      </div>
    );
  }
}
