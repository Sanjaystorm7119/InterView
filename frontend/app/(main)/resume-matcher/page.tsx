"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail, Zap, RefreshCw, Phone, User } from "lucide-react";

import { Resume, JD, Match, BulkCandidate, scoreColor } from "./_components/types";
import SingleEmailDialog from "./_components/SingleEmailDialog";
import BulkEmailDialog from "./_components/BulkEmailDialog";
import MatchResultCard from "./_components/MatchResultCard";
import MatchHistoryList from "./_components/MatchHistoryList";

const HISTORY_PAGE_SIZE = 20;

export default function ResumeMatcherPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jds, setJds] = useState<JD[]>([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [selectedJd, setSelectedJd] = useState("");
  const [matching, setMatching] = useState(false);
  const [result, setResult] = useState<{ match: Match; summary?: string } | null>(null);
  const [history, setHistory] = useState<Match[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);

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

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchHistoryPage = useCallback(async (page: number) => {
    const skip = page * HISTORY_PAGE_SIZE;
    const h = await api.get(`/api/matching/history?skip=${skip}&limit=${HISTORY_PAGE_SIZE}`);
    setHistory(h.data.items as Match[]);
    setHistoryTotal(h.data.total as number);
    setHistoryPage(page);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [r, j, h] = await Promise.all([
        api.get("/api/resumes/"),
        api.get("/api/job-descriptions/"),
        api.get("/api/matching/history?skip=0&limit=100"),
      ]);
      return {
        resumes: r.data as Resume[],
        jds: j.data as JD[],
        history: h.data.items as Match[],
        total: h.data.total as number,
      };
    } catch {
      return null;
    }
  }, []);

  // ── Auto-match ───────────────────────────────────────────────────────────────

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
          await api.post("/api/matching/match", { resume_id: pair.resumeId, jd_id: pair.jdId });
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
          const h = await api.get("/api/matching/history?skip=0&limit=100");
          const refreshedHistory: Match[] = h.data.items;
          setHistory(refreshedHistory);
          setHistoryTotal(h.data.total);
          setHistoryPage(0);

          const matchedPairKeys = new Set(unmatchedPairs.map((p) => p.key));
          const newHistoryEntries = refreshedHistory.filter((m) =>
            matchedPairKeys.has(`${m.resume_id}-${m.jd_id}`),
          );
          const currentThreshold = thresholdRef.current;
          const goodMatches = newHistoryEntries.filter((m) => m.confidence_score >= currentThreshold);
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
      setHistoryTotal(data.total);
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
      if (historyPage === 0) {
        setHistory(data.history);
        setHistoryTotal(data.total);
      }
      if (autoMatchEnabledRef.current) {
        runAutoMatch(data.resumes, data.jds, data.history);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [fetchAll, runAutoMatch, historyPage]);

  const handleRunNow = async () => {
    const data = await fetchAll();
    if (!data) { toast.error("Failed to fetch data"); return; }
    setResumes(data.resumes);
    setJds(data.jds);
    setHistory(data.history);
    setHistoryTotal(data.total);
    setHistoryPage(0);

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
      const h = await api.get("/api/matching/history?skip=0&limit=100");
      setHistory(h.data.items);
      setHistoryTotal(h.data.total);
      setHistoryPage(0);
    } catch {
      toast.error("Failed to run match");
    } finally {
      setMatching(false);
    }
  };

  // ── Email helpers ─────────────────────────────────────────────────────────────

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
        interviewLink: getInterviewLink(jd),
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
      setHistoryTotal(0);
      setAutoMatchResults([]);
      processedPairs.current.clear();
      toast.success("Match history cleared");
    } catch {
      toast.error("Failed to clear history");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

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
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoMatchEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Threshold:</span>
              <input
                type="range" min={0} max={100} step={5} value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-28 accent-amber-500"
              />
              <span className="text-sm font-semibold w-10 tabular-nums">{threshold}%</span>
            </div>
            <Button size="sm" variant="outline" onClick={handleRunNow} disabled={autoMatching} className="ml-auto">
              {autoMatching ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />{autoMatchProgress.done}/{autoMatchProgress.total}</>
              ) : (
                <><RefreshCw className="w-3 h-3 mr-1.5" />Run Now</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Auto-match results ── */}
      {autoMatchResults.length > 0 && (
        <Card className="mb-6 border-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">
                Matched Candidates
                <span className="ml-1.5 text-gray-400 font-normal">
                  ≥ {threshold}% · {autoMatchResults.length} result{autoMatchResults.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <button
                onClick={() => openBulkEmailDialog(autoMatchResults)}
                className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-black font-medium px-3 py-1.5 rounded"
              >
                <Mail className="w-3 h-3" />
                Email All ({autoMatchResults.length})
              </button>
            </div>
            <div className="space-y-2">
              {autoMatchResults.map((m) => {
                const resume = resumes.find((r) => r.id === m.resume_id);
                const jd = jds.find((j) => j.id === m.jd_id);
                return (
                  <div key={`${m.resume_id}-${m.jd_id}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border text-sm">
                    <span className={`font-bold px-2 py-1 rounded text-sm shrink-0 ${scoreColor(m.confidence_score)}`}>
                      {Number(m.confidence_score).toFixed(0)}%
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-gray-800">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{resume?.candidate_name ?? `Candidate #${m.resume_id}`}</span>
                        <span className="text-gray-300 font-normal">·</span>
                        <span className="text-gray-500 font-normal truncate">
                          {jd?.role_title ?? `JD #${m.jd_id}`}
                          {jd?.parsed_data?.company_name ? `, ${jd.parsed_data.company_name}` : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                        {getEmail(resume) ? (
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{getEmail(resume)}</span>
                        ) : (
                          <span className="italic text-gray-300">no email on file</span>
                        )}
                        {getPhone(resume) && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{getPhone(resume)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openEmailDialog(m)}
                      className="ml-auto flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 border border-amber-200 rounded px-2 py-1 shrink-0"
                    >
                      <Mail className="w-3 h-3" />Email
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
          <h2 className="font-semibold mb-4">Manual Match</h2>
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
          <Button onClick={runMatch} disabled={matching} className="bg-amber-500 hover:bg-amber-600 text-black">
            {matching ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Matching...</> : "Run Match"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Manual match result ── */}
      {result && <MatchResultCard result={result} onEmailClick={openEmailDialog} />}

      {/* ── Match history ── */}
      <MatchHistoryList
        history={history}
        historyTotal={historyTotal}
        historyPage={historyPage}
        pageSize={HISTORY_PAGE_SIZE}
        resumes={resumes}
        getEmail={getEmail}
        getPhone={getPhone}
        onEmailClick={openEmailDialog}
        onPageChange={fetchHistoryPage}
        onClear={clearHistory}
      />

      {/* ── Dialogs ── */}
      <SingleEmailDialog
        open={emailDialog}
        onOpenChange={setEmailDialog}
        to={emailTo}
        subject={emailSubject}
        body={emailBody}
        sending={sendingEmail}
        onToChange={setEmailTo}
        onSubjectChange={setEmailSubject}
        onBodyChange={setEmailBody}
        onSend={sendEmail}
      />
      <BulkEmailDialog
        open={bulkDialog}
        onOpenChange={setBulkDialog}
        candidates={bulkCandidates}
        subject={bulkSubject}
        body={bulkBody}
        sending={sendingBulk}
        progress={bulkProgress}
        onCandidatesChange={setBulkCandidates}
        onSubjectChange={setBulkSubject}
        onBodyChange={setBulkBody}
        onSend={sendBulkEmail}
      />
    </div>
  );
}
