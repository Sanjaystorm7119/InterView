"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Mail, Zap, RefreshCw, Phone, User, X, Trash2 } from "lucide-react";

interface Resume {
  id: number;
  candidate_name?: string;
  candidate_email?: string; // primary — set by parse-resume upload
  email?: string;
  phone?: string;
  parsed_data?: {
    current_role?: string;
    candidate_email?: string;
    email?: string;
    phone?: string;
  };
}
interface JD {
  id: number;
  role_title?: string;
  interview_id?: string;
  interview_link?: string;
  parsed_data?: { company_name?: string; interview_link?: string };
}
interface Match {
  id: number;
  resume_id: number;
  jd_id: number;
  confidence_score: number;
  skills_score?: number;
  experience_score?: number;
  semantic_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  summary?: string;
  created_at: string;
}
interface BulkCandidate {
  match: Match;
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  interviewLink: string;
  checked: boolean;
}

export default function ResumeMatcherPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jds, setJds] = useState<JD[]>([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [selectedJd, setSelectedJd] = useState("");
  const [matching, setMatching] = useState(false);
  const [result, setResult] = useState<{ match: Match; summary?: string } | null>(null);
  const [history, setHistory] = useState<Match[]>([]);

  // Auto-match
  const [autoMatchEnabled, setAutoMatchEnabled] = useState(true);
  const [threshold, setThreshold] = useState(70);
  const [autoMatching, setAutoMatching] = useState(false);
  const [autoMatchProgress, setAutoMatchProgress] = useState({ done: 0, total: 0 });
  const [autoMatchResults, setAutoMatchResults] = useState<Match[]>([]);
  const processedPairs = useRef<Set<string>>(new Set());
  const autoMatchEnabledRef = useRef(autoMatchEnabled);
  const thresholdRef = useRef(threshold);

  // Single email dialog
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Bulk email dialog
  const [bulkDialog, setBulkDialog] = useState(false);
  const [bulkCandidates, setBulkCandidates] = useState<BulkCandidate[]>([]);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  useEffect(() => { autoMatchEnabledRef.current = autoMatchEnabled; }, [autoMatchEnabled]);
  useEffect(() => { thresholdRef.current = threshold; }, [threshold]);

  const fetchAll = useCallback(async () => {
    try {
      const [r, j, h] = await Promise.all([
        api.get("/api/resumes/"),
        api.get("/api/job-descriptions/"),
        api.get("/api/matching/history?limit=100"),
      ]);
      return {
        resumes: r.data as Resume[],
        jds: j.data as JD[],
        history: h.data as Match[],
      };
    } catch {
      return null;
    }
  }, []);

  const runAutoMatch = useCallback(
    async (resumeList: Resume[], jdList: JD[], historyList: Match[]) => {
      if (!autoMatchEnabledRef.current || resumeList.length === 0 || jdList.length === 0) return;

      const matchedPairsSet = new Set(historyList.map((m) => `${m.resume_id}-${m.jd_id}`));
      const unmatchedPairs: { resumeId: number; jdId: number; key: string }[] = [];

      for (const r of resumeList) {
        for (const j of jdList) {
          const key = `${r.id}-${j.id}`;
          if (!matchedPairsSet.has(key) && !processedPairs.current.has(key)) {
            unmatchedPairs.push({ resumeId: r.id, jdId: j.id, key });
          }
        }
      }

      if (unmatchedPairs.length === 0) return;

      setAutoMatching(true);
      setAutoMatchProgress({ done: 0, total: unmatchedPairs.length });
      toast.info(`Auto-matching ${unmatchedPairs.length} new pair${unmatchedPairs.length > 1 ? "s" : ""}…`);

      let succeeded = 0;
      for (let i = 0; i < unmatchedPairs.length; i++) {
        const pair = unmatchedPairs[i];
        try {
          await api.post("/api/matching/match", {
            resume_id: pair.resumeId,
            jd_id: pair.jdId,
          });
          succeeded++;
        } catch {
          // skip silently
        } finally {
          processedPairs.current.add(pair.key);
          setAutoMatchProgress({ done: i + 1, total: unmatchedPairs.length });
        }
      }

      setAutoMatching(false);

      if (succeeded > 0) {
        try {
          const h = await api.get("/api/matching/history?limit=100");
          const refreshedHistory: Match[] = h.data;
          setHistory(refreshedHistory);

          const matchedPairKeys = new Set(unmatchedPairs.map((p) => p.key));
          const newHistoryEntries = refreshedHistory.filter((m) =>
            matchedPairKeys.has(`${m.resume_id}-${m.jd_id}`),
          );
          const currentThreshold = thresholdRef.current;
          const goodMatches = newHistoryEntries.filter(
            (m) => m.confidence_score >= currentThreshold,
          );
          if (goodMatches.length > 0) {
            setAutoMatchResults((prev) => {
              const merged = [...goodMatches, ...prev];
              const seen = new Map<string, Match>();
              for (const m of merged) {
                const k = `${m.resume_id}-${m.jd_id}`;
                if (!seen.has(k)) seen.set(k, m);
              }
              return Array.from(seen.values()).slice(0, 50);
            });
            toast.success(
              `Auto-match: ${goodMatches.length} match${goodMatches.length > 1 ? "es" : ""} ≥ ${currentThreshold}%`,
            );
          } else {
            toast.info(`Auto-match complete — no matches above ${currentThreshold}% threshold`);
          }
        } catch {
          // ignore
        }
      }
    },
    [],
  );

  useEffect(() => {
    fetchAll().then((data) => {
      if (!data) return;
      setResumes(data.resumes);
      setJds(data.jds);
      setHistory(data.history);
      data.history.forEach((m) => processedPairs.current.add(`${m.resume_id}-${m.jd_id}`));
      runAutoMatch(data.resumes, data.jds, data.history);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(async () => {
      const data = await fetchAll();
      if (!data) return;
      setResumes(data.resumes);
      setJds(data.jds);
      setHistory(data.history);
      if (autoMatchEnabledRef.current) {
        runAutoMatch(data.resumes, data.jds, data.history);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [fetchAll, runAutoMatch]);

  const handleRunNow = async () => {
    const data = await fetchAll();
    if (!data) { toast.error("Failed to fetch data"); return; }
    setResumes(data.resumes);
    setJds(data.jds);
    setHistory(data.history);

    // Immediately populate results from history — all pairs above current threshold,
    // deduped (best score per pair), sorted highest-score first.
    const currentThreshold = threshold;
    const seen = new Map<string, Match>();
    const sorted = (data.history as Match[])
      .filter((m) => m.confidence_score >= currentThreshold)
      .sort((a, b) => b.confidence_score - a.confidence_score);
    for (const m of sorted) {
      const key = `${m.resume_id}-${m.jd_id}`;
      if (!seen.has(key)) seen.set(key, m);
    }
    setAutoMatchResults(Array.from(seen.values()));

    // Also kick off matching for any new unmatched pairs
    runAutoMatch(data.resumes, data.jds, data.history);
  };

  const runMatch = async () => {
    if (!selectedResume || !selectedJd) {
      toast.error("Select both a resume and a job description");
      return;
    }
    processedPairs.current.add(`${selectedResume}-${selectedJd}`);
    setMatching(true);
    setResult(null);
    try {
      const { data } = await api.post("/api/matching/match", {
        resume_id: parseInt(selectedResume),
        jd_id: parseInt(selectedJd),
      });
      setResult(data);
      toast.success("Match complete!");
      const h = await api.get("/api/matching/history?limit=100");
      setHistory(h.data);
    } catch {
      toast.error("Failed to run match");
    } finally {
      setMatching(false);
    }
  };

  // ── Email helpers ──────────────────────────────────────────────────────────

  const getEmail = (r: Resume | undefined) =>
    r?.candidate_email ?? r?.email ?? r?.parsed_data?.candidate_email ?? r?.parsed_data?.email ?? "";
  const getPhone = (r: Resume | undefined) => r?.phone ?? r?.parsed_data?.phone ?? "";
  const getInterviewLink = (j: JD | undefined) => {
    if (j?.interview_id) {
      const base = process.env.NEXT_PUBLIC_HOST_URL ?? "http://localhost:3000/interview";
      return `${base}/${j.interview_id}`;
    }
    return j?.interview_link ?? j?.parsed_data?.interview_link ?? "";
  };

  const buildEmailContent = (resume: Resume | undefined, jd: JD | undefined) => {
    const name = resume?.candidate_name ?? "Candidate";
    const role = jd?.role_title ?? "a position";
    const company = jd?.parsed_data?.company_name ?? "our company";
    const interviewLink = getInterviewLink(jd);
    return {
      subject: `You've been shortlisted for ${role} at ${company}`,
      body: `Dear ${name},\n\nWe are pleased to inform you that your profile has been shortlisted for the role of ${role} at ${company}.\n\nPlease use the following link to begin your interview:\n${interviewLink}\n\nWe look forward to speaking with you.\n\nBest regards,\nHireAva Recruitment Team`,
    };
  };

  const openEmailDialog = (match: Match) => {
    const resume = resumes.find((r) => r.id === match.resume_id);
    const jd = jds.find((j) => j.id === match.jd_id);
    const { subject, body } = buildEmailContent(resume, jd);
    setEmailTo(getEmail(resume));
    setEmailSubject(subject);
    setEmailBody(body);
    setEmailDialog(true);
  };

  const sendEmail = async () => {
    if (!emailTo) { toast.error("Recipient email is required"); return; }
    if (!emailSubject || !emailBody) { toast.error("Subject and body are required"); return; }
    setSendingEmail(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo, subject: emailSubject, text: emailBody }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(typeof err?.error === "string" ? err.error : (err?.error?.message ?? "Send failed"));
      }
      toast.success(`Email sent to ${emailTo}`);
      setEmailDialog(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const openBulkEmailDialog = (matches: Match[]) => {
    const candidates: BulkCandidate[] = matches.map((m) => {
      const resume = resumes.find((r) => r.id === m.resume_id);
      const jd = jds.find((j) => j.id === m.jd_id);
      const email = getEmail(resume);
      return {
        match: m,
        name: resume?.candidate_name ?? `Candidate #${m.resume_id}`,
        email,
        phone: getPhone(resume),
        role: jd?.role_title ?? `Position #${m.jd_id}`,
        company: jd?.parsed_data?.company_name ?? "our company",
        interviewLink: getInterviewLink(jd), // resolved per candidate's JD
        checked: !!email,
      };
    });
    setBulkCandidates(candidates);
    setBulkSubject("You've been shortlisted — next steps");
    setBulkBody(
      `Dear [Candidate Name],\n\nWe are pleased to inform you that your profile has been shortlisted for [Role] at [Company].\n\nPlease use the following link to begin your interview:\n[Interview Link]\n\nWe look forward to speaking with you.\n\nBest regards,\nHireAva Recruitment Team`,
    );
    setBulkDialog(true);
  };

  const sendBulkEmail = async () => {
    const selected = bulkCandidates.filter((c) => c.checked && c.email.trim());
    if (selected.length === 0) {
      toast.error("No candidates with email addresses selected");
      return;
    }
    setSendingBulk(true);
    setBulkProgress({ done: 0, total: selected.length });
    let succeeded = 0;
    for (let i = 0; i < selected.length; i++) {
      const c = selected[i];
      // c.interviewLink is already resolved per JD — no further lookup needed
      const personalBody = bulkBody
        .replace(/\[Candidate Name\]/g, c.name)
        .replace(/\[Role\]/g, c.role)
        .replace(/\[Company\]/g, c.company)
        .replace(/\[Interview Link\]/g, c.interviewLink || "[Interview Link not set]");
      try {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: c.email, subject: bulkSubject, text: personalBody }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error(`[bulk-email] Failed for ${c.email}:`, err?.error ?? res.status);
          throw new Error();
        }
        succeeded++;
      } catch {
        // continue with remaining recipients
      }
      setBulkProgress({ done: i + 1, total: selected.length });
    }
    setSendingBulk(false);
    if (succeeded === selected.length) {
      toast.success(`Sent ${succeeded} email${succeeded > 1 ? "s" : ""}`);
    } else {
      toast.warning(`Sent ${succeeded}/${selected.length} — some failed`);
    }
    setBulkDialog(false);
  };

  const clearHistory = async () => {
    try {
      await api.delete("/api/matching/history");
      setHistory([]);
      setAutoMatchResults([]);
      processedPairs.current.clear();
      toast.success("Match history cleared");
    } catch {
      toast.error("Failed to clear history");
    }
  };

  // ── Derived display data ───────────────────────────────────────────────────

  const displayHistory = (() => {
    const seen = new Map<string, Match>();
    const sorted = history
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    for (const m of sorted) {
      const key = `${m.resume_id}-${m.jd_id}`;
      if (!seen.has(key)) seen.set(key, m);
    }
    return Array.from(seen.values());
  })();

  const scoreColor = (s: number) =>
    s >= 70
      ? "text-green-600 bg-green-50"
      : s >= 40
        ? "text-amber-600 bg-amber-50"
        : "text-red-600 bg-red-50";

  const checkedCount = bulkCandidates.filter((c) => c.checked && c.email).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Resume Matcher</h1>

      {/* ── Auto-match settings ── */}
      <Card className="mb-4 border-amber-100">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Auto-Match</span>
              <button
                onClick={() => setAutoMatchEnabled((v) => !v)}
                aria-label="Toggle auto-match"
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${autoMatchEnabled ? "bg-amber-500" : "bg-gray-200"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoMatchEnabled ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Threshold:</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-28 accent-amber-500"
              />
              <span className="text-sm font-semibold w-10 tabular-nums">{threshold}%</span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRunNow}
              disabled={autoMatching}
              className="ml-auto"
            >
              {autoMatching ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  {autoMatchProgress.done}/{autoMatchProgress.total}
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Run Now
                </>
              )}
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* ── Run Now results ── */}
      {autoMatchResults.length > 0 && (
        <Card className="mb-6 border-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold text-sm">
                  Matched Candidates
                  <span className="ml-1.5 text-gray-400 font-normal">
                    ≥ {threshold}% · {autoMatchResults.length} result{autoMatchResults.length !== 1 ? "s" : ""}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => openBulkEmailDialog(autoMatchResults)}
                className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-black font-medium px-3 py-1.5 rounded"
              >
                <Mail className="w-3 h-3" />
                Email All ({autoMatchResults.length})
              </button>
            </div>

            <div className="space-y-2">
              {autoMatchResults.map((m, i) => {
                const resume = resumes.find((r) => r.id === m.resume_id);
                const jd = jds.find((j) => j.id === m.jd_id);
                return (
                  <div
                    key={`${m.resume_id}-${m.jd_id}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border text-sm"
                  >
                    {/* Score */}
                    <span className={`font-bold px-2 py-1 rounded text-sm shrink-0 ${scoreColor(m.confidence_score)}`}>
                      {Number(m.confidence_score).toFixed(0)}%
                    </span>

                    {/* Candidate info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-gray-800">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {resume?.candidate_name ?? `Candidate #${m.resume_id}`}
                        </span>
                        <span className="text-gray-300 font-normal">·</span>
                        <span className="text-gray-500 font-normal truncate">
                          {jd?.role_title ?? `JD #${m.jd_id}`}
                          {jd?.parsed_data?.company_name ? `, ${jd.parsed_data.company_name}` : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                        {getEmail(resume) ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {getEmail(resume)}
                          </span>
                        ) : (
                          <span className="italic text-gray-300">no email on file</span>
                        )}
                        {getPhone(resume) && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {getPhone(resume)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Individual email */}
                    <button
                      onClick={() => openEmailDialog(m)}
                      className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-400 rounded px-2.5 py-1.5 shrink-0 transition-colors"
                    >
                      <Mail className="w-3 h-3" />
                      Email
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Manual match ── */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Select Resume</label>
              <select
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Choose a resume...</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.candidate_name ?? `Resume #${r.id}`} — {r.parsed_data?.current_role ?? "No role"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Select Job Description</label>
              <select
                value={selectedJd}
                onChange={(e) => setSelectedJd(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Choose a job description...</option>
                {jds.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.role_title ?? `JD #${j.id}`} — {j.parsed_data?.company_name ?? ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            onClick={runMatch}
            disabled={matching}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {matching ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Matching...</>
            ) : (
              "Run Match"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Manual match result ── */}
      {result && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Match Result</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEmailDialog(result.match)}
                  className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 border border-amber-200 rounded px-2.5 py-1"
                >
                  <Mail className="w-4 h-4" />
                  Email Candidate
                </button>
                <span className={`text-2xl font-bold px-4 py-1 rounded-lg ${scoreColor(result.match.confidence_score)}`}>
                  {result.match.confidence_score}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: "Skills", value: result.match.skills_score },
                { label: "Experience", value: result.match.experience_score },
                { label: "Semantic", value: result.match.semantic_score },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-lg font-bold ${scoreColor(s.value ?? 0)}`}>{s.value}%</p>
                </div>
              ))}
            </div>
            {(result.match.matched_skills?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-green-700 mb-1">Matched Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {result.match.matched_skills!.map((s, i) => (
                    <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {(result.match.missing_skills?.length ?? 0) > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-red-700 mb-1">Missing Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {result.match.missing_skills!.map((s, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {result.summary && (
              <p className="text-sm text-gray-600 mt-3">{result.summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Match history ── */}
      {displayHistory.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Match History</h2>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-400 rounded px-2.5 py-1.5 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear History
            </button>
          </div>
          <div className="space-y-2">
            {displayHistory.map((m) => {
              const resume = resumes.find((r) => r.id === m.resume_id);
              const jd = jds.find((j) => j.id === m.jd_id);
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
                        {jd?.role_title ?? `JD #${m.jd_id}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                        {getEmail(resume) && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {getEmail(resume)}
                          </span>
                        )}
                        {getPhone(resume) && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {getPhone(resume)}
                          </span>
                        )}
                        <span>{new Date(m.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => openEmailDialog(m)}
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
        </>
      )}

      {/* ── Single email dialog ── */}
      <Dialog open={emailDialog} onOpenChange={setEmailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-500" />
              Send Email to Candidate
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">To</label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="candidate@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Subject</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Body</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Email body..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEmailDialog(false)} disabled={sendingEmail}>Cancel</Button>
              <Button
                onClick={sendEmail}
                disabled={sendingEmail}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {sendingEmail
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  : <><Mail className="w-4 h-4 mr-2" />Send Email</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bulk email dialog ── */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-amber-500" />
              Email All Matching Candidates
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
            {/* Recipients */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">
                  Recipients
                  <span className="text-gray-400 font-normal ml-1.5">
                    ({checkedCount} selected)
                  </span>
                </label>
                <button
                  className="text-xs text-amber-600 hover:text-amber-700"
                  onClick={() =>
                    setBulkCandidates((prev) =>
                      prev.map((c) => ({ ...c, checked: !!(c.email) })),
                    )
                  }
                >
                  Select all with email
                </button>
              </div>
              <div className="border rounded-md divide-y max-h-44 overflow-y-auto">
                {bulkCandidates.map((c, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 ${!c.email ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-amber-500"
                      checked={c.checked}
                      disabled={!c.email}
                      onChange={() =>
                        setBulkCandidates((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)),
                        )
                      }
                    />
                    <div className="flex-1 min-w-0 text-sm">
                      <p className="font-medium truncate">{c.name}</p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
                        {c.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />{c.email}
                          </span>
                        ) : (
                          <span className="italic text-gray-300">no email on file</span>
                        )}
                        {c.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />{c.phone}
                          </span>
                        )}
                      </div>
                      {c.interviewLink ? (
                        <p className="text-xs text-blue-500 truncate mt-0.5">{c.interviewLink}</p>
                      ) : (
                        <p className="text-xs text-amber-500 mt-0.5">No interview linked to this JD</p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${scoreColor(c.match.confidence_score)}`}>
                      {Number(c.match.confidence_score).toFixed(0)}%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setBulkCandidates((prev) => prev.filter((_, j) => j !== i)); }}
                      className="ml-1 text-gray-300 hover:text-red-400 shrink-0 mt-0.5 transition-colors"
                      title="Remove from list"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                <strong>[Candidate Name]</strong>, <strong>[Role]</strong>, <strong>[Company]</strong>, and <strong>[Interview Link]</strong> are replaced per recipient. Each candidate's interview link is shown below their name.
              </p>
            </div>

            {/* Subject */}
            <div>
              <label className="text-sm font-medium mb-1 block">Subject</label>
              <Input
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-sm font-medium mb-1 block">Body</label>
              <textarea
                value={bulkBody}
                onChange={(e) => setBulkBody(e.target.value)}
                rows={7}
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Email body..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t mt-1">
            <span className="text-xs text-gray-500">
              {sendingBulk
                ? `Sending ${bulkProgress.done}/${bulkProgress.total}…`
                : "Interview links are auto-filled per candidate"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkDialog(false)} disabled={sendingBulk}>
                Cancel
              </Button>
              <Button
                onClick={sendBulkEmail}
                disabled={sendingBulk || checkedCount === 0}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {sendingBulk
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{bulkProgress.done}/{bulkProgress.total}</>
                  : <><Mail className="w-4 h-4 mr-2" />Send to {checkedCount}</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
