"use client";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import moment from "moment";

export default function ScheduledInterviewPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [feedbackCounts, setFeedbackCounts] = useState<Record<string, number>>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  useEffect(() => {
    loadInterviews();
  }, [page, debouncedSearch]);

  const loadInterviews = async () => {
    try {
      const { data } = await api.get("/api/interviews/", { params: { page, limit: 6, search: debouncedSearch || undefined } });
      setInterviews(data);
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (iv: any) => {
          try {
            const res = await api.get(`/api/interviews/${iv.interview_id}/feedback/count`);
            counts[iv.interview_id] = res.data.count;
          } catch { counts[iv.interview_id] = 0; }
        })
      );
      setFeedbackCounts(counts);
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Scheduled Interviews</h1>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by position or company..."
            className="pl-9"
          />
        </div>
      </div>

      {interviews.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-500">No interviews found.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interviews.map((iv) => (
              <Link key={iv.id} href={`/scheduled-interview/${iv.interview_id}/details`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {iv.company_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{iv.job_position}</h3>
                        <p className="text-xs text-gray-500">{iv.company_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{iv.duration} min</span>
                      <span>{feedbackCounts[iv.interview_id] || 0} candidates</span>
                      <span>{moment(iv.created_at).fromNow()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Prev</button>
            <span className="px-3 py-1 text-sm">Page {page}</span>
            <button onClick={() => setPage(page + 1)} disabled={interviews.length < 6} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
          </div>
        </>
      )}
    </div>
  );
}
