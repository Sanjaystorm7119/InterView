"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Star, ClipboardList, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import moment from "moment";

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-28 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="w-11 h-11 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

function InterviewCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-1.5" />
            <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ created: 0, completed: 0, candidates: 0, avgScore: 0 });
  const [interviews, setInterviews] = useState<any[]>([]);
  const [feedbackCounts, setFeedbackCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [interviewsRes, countRes] = await Promise.all([
        api.get("/api/interviews/latest?limit=6"),
        api.get("/api/interviews/count"),
      ]);
      setInterviews(interviewsRes.data);

      const counts: Record<string, number> = {};
      let totalCandidates = 0;
      let totalScore = 0;
      let scoreCount = 0;

      await Promise.all(
        interviewsRes.data.map(async (iv: any) => {
          try {
            const fbRes = await api.get(`/api/interviews/${iv.interview_id}/feedback`);
            counts[iv.interview_id] = fbRes.data.length;
            totalCandidates += fbRes.data.length;
            fbRes.data.forEach((fb: any) => {
              const rating = fb.feedback?.feedback?.rating?.OverallRating;
              if (rating) {
                totalScore += rating;
                scoreCount++;
              }
            });
          } catch {
            counts[iv.interview_id] = 0;
          }
        })
      );

      setFeedbackCounts(counts);
      setStats({
        created: countRes.data.count,
        completed: totalCandidates,
        candidates: totalCandidates,
        avgScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0,
      });
    } catch {
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {user?.firstname || "there"}!
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s your recruitment overview</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs font-medium hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          [
            { label: "Interviews Created", value: stats.created, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
            { label: "Candidates Evaluated", value: stats.candidates, icon: Users, color: "text-green-600 bg-green-50" },
            { label: "Avg Score", value: stats.avgScore || "N/A", icon: Star, color: "text-amber-600 bg-amber-50" },
            { label: "Credits Left", value: user?.credits ?? 0, icon: Calendar, color: "text-purple-600 bg-purple-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold mt-1">{s.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Actions + Recent */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Interviews</h2>
        <Link href="/dashboard/create-interview">
          <Button className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus className="w-4 h-4 mr-2" /> Create Interview
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <InterviewCardSkeleton key={i} />)}
        </div>
      ) : !error && interviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">No interviews yet. Create your first one!</p>
            <Link href="/dashboard/create-interview">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black">Create Interview</Button>
            </Link>
          </CardContent>
        </Card>
      ) : !error ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {interviews.map((iv) => (
            <Link key={iv.id} href={`/scheduled-interview/${iv.interview_id}/details`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                      {iv.company_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{iv.job_position}</h3>
                      <p className="text-xs text-gray-500">{iv.company_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                    <span>{iv.duration} min</span>
                    <span>{feedbackCounts[iv.interview_id] || 0} candidates</span>
                    <span>{moment(iv.created_at).fromNow()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
