"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Brain,
  BookOpen,
  CreditCard,
  HelpCircle,
  FileSearch,
  Activity,
  Bot,
  Settings,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../lib/api";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface WorkQueueCounts {
  batchesAwaitingReview: number;
  contentAwaitingApproval: number;
  contentAwaitingExtraction: number;
  topicsWithoutFlashcards: number;
  questionsNeedingReview: number;
}

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [workQueueCounts, setWorkQueueCounts] = useState<WorkQueueCounts>({
    batchesAwaitingReview: 0,
    contentAwaitingApproval: 0,
    contentAwaitingExtraction: 0,
    topicsWithoutFlashcards: 0,
    questionsNeedingReview: 0,
  });

  useEffect(() => {
    // Fetch work queue counts
    const fetchCounts = async () => {
      try {
        // TODO: Implement API endpoints for these counts
        // For now, using placeholder
        setWorkQueueCounts({
          batchesAwaitingReview: 0,
          contentAwaitingApproval: 0,
          contentAwaitingExtraction: 0,
          topicsWithoutFlashcards: 0,
          questionsNeedingReview: 0,
        });
      } catch (error) {
        console.error("Failed to fetch work queue counts:", error);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
      label: "Uploads / Batches",
      href: "/batches",
      icon: Upload,
      badge: workQueueCounts.batchesAwaitingReview,
    },
    {
      label: "Content Review",
      href: "/content-review",
      icon: FileText,
      badge: workQueueCounts.contentAwaitingApproval,
    },
    {
      label: "Knowledge Points",
      href: "/knowledge-points",
      icon: Brain,
      badge: workQueueCounts.contentAwaitingExtraction,
    },
    {
      label: "Knowledge Review",
      href: "/knowledge/review",
      icon: Brain,
    },
    {
      label: "Topics",
      href: "/topics",
      icon: BookOpen,
      badge: workQueueCounts.topicsWithoutFlashcards,
    },
    { label: "Flashcards", href: "/flashcards", icon: CreditCard },
    { label: "Flashcards Review", href: "/flashcards/review", icon: CreditCard },
    { label: "Exam Questions", href: "/exam-questions", icon: HelpCircle },
    {
      label: "Generated Questions",
      href: "/generated-questions",
      icon: FileText,
    },
    {
      label: "Ontology Review",
      href: "/exam-questions/ontology-review",
      icon: AlertCircle,
      badge: workQueueCounts.questionsNeedingReview,
    },

    { label: "Exam Intelligence", href: "/exam-intelligence", icon: BarChart3 },
    { label: "Concepts", href: "/concepts", icon: BookOpen },
    { label: "Unresolved Hints", href: "/unresolved-hints", icon: AlertCircle },
    {
      label: "Prerequisite Learning",
      href: "/prerequisite-learning",
      icon: Brain,
    },
    { label: "AI Analytics", href: "/ai-analytics", icon: Bot },
    { label: "AI Config", href: "/ai-config", icon: Settings },
    { label: "Logs / Activity", href: "/logs", icon: Activity },
  ];

  // Extract active context from pathname
  const getActiveContext = () => {
    if (pathname?.includes("/batches/")) {
      const batchId = pathname.split("/batches/")[1]?.split("/")[0];
      return batchId ? `Batch: ${batchId.substring(0, 8)}...` : null;
    }

    return null;
  };

  const activeContext = getActiveContext();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">TUS Editor</h1>
          <p className="text-xs text-gray-600 mt-1">
            Medical Education Platform
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors group
                  ${isActive ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-100"}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`
                      px-2 py-0.5 text-xs font-semibold rounded-full
                      ${isActive ? "bg-blue-200 text-blue-800" : "bg-red-100 text-red-800"}
                    `}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col">
        {/* Top Status Bar */}
        {activeContext && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {activeContext}
                </span>
              </div>
              <Link
                href="/dashboard"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Clear context
              </Link>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
