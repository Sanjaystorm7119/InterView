"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Copy, Download, Mail, MessageSquare, Star, User } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import moment from "moment";

export default function InterviewDetailsPage() {
  const { id } = useParams();
  const [interview, setInterview] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [selectedFb, setSelectedFb] = useState<any>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [ivRes, fbRes] = await Promise.all([
        api.get(`/api/interviews/${id}`),
        api.get(`/api/interviews/${id}/feedback`),
      ]);
      setInterview(ivRes.data);
      setFeedbacks(fbRes.data);
    } catch { toast.error("Failed to load interview"); }
  };

  const interviewLink = `${process.env.NEXT_PUBLIC_HOST_URL || "http://localhost:3000/interview"}/${id}`;

  const ratingColor = (v: number) => (v >= 7 ? "bg-green-500" : v >= 4 ? "bg-amber-500" : "bg-red-500");

  const exportCSV = () => {
    if (!feedbacks.length) return;
    const headers = [
      "Candidate Name", "Email", "Overall Score", "Technical Skills",
      "Communication", "Problem Solving", "Experience", "Recommendation",
      "Date",
    ];
    const rows = feedbacks.map((fb) => {
      const rating = fb.feedback?.feedback?.rating || {};
      const rec = fb.feedback?.feedback?.Recommendation || "";
      return [
        fb.user_name || "",
        fb.user_email || "",
        rating.OverallRating ?? "",
        rating.TechnicalSkills ?? "",
        rating.Communication ?? "",
        rating.ProblemSolving ?? "",
        rating.Experience ?? "",
        rec,
        new Date(fb.created_at).toLocaleDateString(),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${interview?.job_position || "interview"}_candidates.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  if (!interview) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/scheduled-interview"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{interview.job_position}</h1>
          <p className="text-gray-500">{interview.company_name} &middot; {interview.duration} min</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={feedbacks.length === 0}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(interviewLink); toast.success("Link copied!"); }}>
          <Copy className="w-4 h-4 mr-2" /> Copy Link
        </Button>
      </div>

      {/* Interview Details */}
      <Card className="mb-6">
        <CardContent className="p-5 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Position:</span> <span className="font-medium ml-1">{interview.job_position}</span></div>
          <div><span className="text-gray-500">Company:</span> <span className="font-medium ml-1">{interview.company_name}</span></div>
          <div><span className="text-gray-500">Duration:</span> <span className="font-medium ml-1">{interview.duration} min</span></div>
          <div><span className="text-gray-500">Questions:</span> <span className="font-medium ml-1">{interview.question_list?.length || 0}</span></div>
          <div className="col-span-2"><span className="text-gray-500">Created:</span> <span className="font-medium ml-1">{moment(interview.created_at).format("MMM D, YYYY h:mm A")}</span></div>
        </CardContent>
      </Card>

      {/* Candidates */}
      <h2 className="text-lg font-semibold mb-4">Candidates ({feedbacks.length})</h2>

      {feedbacks.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-gray-500">No candidates have completed this interview yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => {
            const rating = fb.feedback?.feedback?.rating;
            const overall = rating?.OverallRating || 0;
            const recommendation = fb.feedback?.feedback?.Recommendation;

            return (
              <Card key={fb.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{fb.user_name || fb.user_email}</p>
                    <p className="text-xs text-gray-500">{moment(fb.created_at).format("MMM D, YYYY h:mm A")}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="font-bold">{overall}/10</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${recommendation === "recommended" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {recommendation || "N/A"}
                  </span>

                  {/* Feedback Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedFb(fb)}>
                        <Star className="w-3 h-3 mr-1" /> Feedback
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Candidate Feedback</DialogTitle></DialogHeader>
                      {rating && (
                        <div className="space-y-3 mt-4">
                          {Object.entries(rating).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-sm w-40 text-gray-600 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                              <Progress value={(val as number) * 10} className="flex-1" indicatorClassName={ratingColor(val as number)} />
                              <span className="text-sm font-bold w-8">{val as number}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {fb.feedback?.feedback?.summary && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-sm mb-2">Summary</h4>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {fb.feedback.feedback.summary.map((s: string, i: number) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {fb.feedback?.feedback?.RecommendationMessage && (
                        <p className="mt-3 text-sm italic text-gray-500">{fb.feedback.feedback.RecommendationMessage}</p>
                      )}
                    </DialogContent>
                  </Dialog>

                  {/* Transcript Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm"><MessageSquare className="w-3 h-3 mr-1" /> Transcript</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Interview Transcript</DialogTitle></DialogHeader>
                      <div className="space-y-3 mt-4">
                        {(() => {
                          let transcript = fb.transcript;
                          if (typeof transcript === "string") {
                            try { transcript = JSON.parse(transcript); } catch { transcript = []; }
                          }
                          if (!Array.isArray(transcript) || transcript.length === 0) {
                            return <p className="text-gray-500 text-sm">No transcript available.</p>;
                          }
                          return transcript.map((item: any, i: number) => (
                            <div key={i} className={`flex ${item.ai_message ? "justify-start" : "justify-end"}`}>
                              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${item.ai_message ? "bg-blue-50 text-blue-900" : "bg-gray-100 text-gray-900"}`}>
                                <p className="text-xs font-semibold mb-1">{item.ai_message ? "Eva (AI)" : "Candidate"}</p>
                                {item.ai_message || item.user_message}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
