import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Trash2 } from "lucide-react";
import { Match, Resume, scoreColor } from "./types";

interface Props {
  history: Match[];
  historyTotal: number;
  historyPage: number;
  pageSize: number;
  resumes: Resume[];
  getEmail: (r: Resume | undefined) => string;
  getPhone: (r: Resume | undefined) => string;
  onEmailClick: (match: Match) => void;
  onPageChange: (page: number) => void;
  onClear: () => void;
}

export default function MatchHistoryList({
  history, historyTotal, historyPage, pageSize, resumes,
  getEmail, getPhone, onEmailClick, onPageChange, onClear,
}: Props) {
  // Build deduped display list
  const displayHistory = (() => {
    const seen = new Map<string, Match>();
    const sorted = history.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    for (const m of sorted) {
      const key = `${m.resume_id}-${m.jd_id}`;
      if (!seen.has(key)) seen.set(key, m);
    }
    return Array.from(seen.values());
  })();

  if (historyTotal === 0 && displayHistory.length === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">
          Match History
          {historyTotal > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">{historyTotal} total</span>
          )}
        </h2>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-400 rounded px-2.5 py-1.5 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Clear History
        </button>
      </div>

      <div className="space-y-2">
        {displayHistory.map((m) => {
          const resume = resumes.find((r) => r.id === m.resume_id);
          const email = getEmail(resume);
          const phone = getPhone(resume);
          return (
            <Card key={m.id}>
              <CardContent className="p-3 flex items-center gap-4 text-sm">
                <span className={`font-bold px-2 py-0.5 rounded shrink-0 ${scoreColor(m.confidence_score)}`}>
                  {Number(m.confidence_score).toFixed(0)}%
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 font-medium truncate">
                    {resume?.candidate_name ?? `Resume #${m.resume_id}`}
                    <span className="font-normal text-gray-400"> vs </span>
                    {`JD #${m.jd_id}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                    {email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {email}
                      </span>
                    )}
                    {phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {phone}
                      </span>
                    )}
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => onEmailClick(m)}
                  className="ml-auto flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 border border-amber-100 rounded px-2 py-1 shrink-0"
                >
                  <Mail className="w-3 h-3" />
                  Email
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {historyTotal > pageSize && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>Page {historyPage + 1} of {Math.ceil(historyTotal / pageSize)}</span>
          <div className="flex gap-2">
            <button
              disabled={historyPage === 0}
              onClick={() => onPageChange(historyPage - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={(historyPage + 1) * pageSize >= historyTotal}
              onClick={() => onPageChange(historyPage + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
