"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart2, Users, Star, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface AnalyticsSummary {
  total_interviews: number;
  total_completions: number;
  avg_score: number;
  recommendation_rate: number;
  funnel: { stage: string; count: number }[];
  role_scores: { role: string; avg_score: number; count: number }[];
  recent_completions: {
    candidate_name: string;
    job_position: string;
    overall_score: number | null;
    recommendation: string;
    created_at: string;
  }[];
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
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

const BAR_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/analytics/summary");
      setData(res.data);
    } catch {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const funnelMax = data?.funnel[0]?.count ?? 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Recruitment performance overview</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : data ? (
          <>
            <StatCard label="Interviews Created" value={data.total_interviews} icon={BarChart2} color="text-blue-600 bg-blue-50" />
            <StatCard label="Candidates Completed" value={data.total_completions} icon={Users} color="text-green-600 bg-green-50" />
            <StatCard label="Average Score" value={data.avg_score > 0 ? `${data.avg_score}/10` : "N/A"} icon={Star} color="text-amber-600 bg-amber-50" />
            <StatCard label="Recommendation Rate" value={`${data.recommendation_rate}%`} sub="of completed interviews" icon={CheckCircle} color="text-purple-600 bg-purple-50" />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Funnel */}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-4">Candidate Funnel</h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" style={{ width: `${100 - i * 25}%` }} />
                ))}
              </div>
            ) : data ? (
              <div className="space-y-3">
                {data.funnel.map((step, i) => {
                  const pct = funnelMax > 0 ? Math.round((step.count / funnelMax) * 100) : 0;
                  const colors = ["bg-blue-500", "bg-amber-500", "bg-green-500"];
                  return (
                    <div key={step.stage}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{step.stage}</span>
                        <span className="font-semibold">{step.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                          className={`h-6 rounded-full flex items-center px-2 text-xs text-white font-medium transition-all duration-500 ${colors[i]}`}
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        >
                          {pct > 15 ? `${pct}%` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Scores by role */}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-4">Avg Score by Role</h2>
            {loading ? (
              <div className="h-48 bg-gray-100 rounded animate-pulse" />
            ) : data && data.role_scores.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.role_scores} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="role"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, _: string, props: any) => [
                      `${value}/10 (${props.payload.count} candidates)`,
                      "Avg Score",
                    ]}
                  />
                  <Bar dataKey="avg_score" radius={[4, 4, 0, 0]}>
                    {data.role_scores.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">
                No scored interviews yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent completions */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-4">Recent Completions</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : data && data.recent_completions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Candidate</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium text-center">Score</th>
                    <th className="pb-2 font-medium text-center">Rec.</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recent_completions.map((c, i) => {
                    const rec = c.recommendation?.toLowerCase();
                    const isRec = rec === "yes" || rec === "recommended" || rec === "true";
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium">{c.candidate_name}</td>
                        <td className="py-2.5 text-gray-500 truncate max-w-[160px]">{c.job_position}</td>
                        <td className="py-2.5 text-center">
                          {c.overall_score != null ? (
                            <span className={`font-bold text-xs px-2 py-0.5 rounded ${
                              c.overall_score >= 7 ? "bg-green-50 text-green-700" :
                              c.overall_score >= 4 ? "bg-amber-50 text-amber-700" :
                              "bg-red-50 text-red-700"
                            }`}>
                              {c.overall_score}/10
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isRec ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          }`}>
                            {isRec ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-400 text-xs">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No completed interviews yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
