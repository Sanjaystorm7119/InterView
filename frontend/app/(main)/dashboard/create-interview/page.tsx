"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { InterviewTypes } from "@/constants/uiConstants";
import { ArrowLeft, ArrowRight, Copy, Loader2, Mail, Upload, X, GripVertical } from "lucide-react";
import Link from "next/link";

export default function CreateInterviewPage() {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    jobPosition: "",
    jobDescription: "",
    companyName: "",
    companyDetails: "",
    duration: "10",
    type: ["Technical", "Behavioral", "Experience"],
  });
  const [questions, setQuestions] = useState<{ question: string; type: string }[]>([]);
  const [interviewId, setInterviewId] = useState("");
  const [interviewLink, setInterviewLink] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      toast.loading("Parsing document...", { id: "parse" });
      const { data } = await api.post("/api/ai/parse-document", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.dismiss("parse");
      toast.success("Document parsed!");
      setFormData((prev) => ({
        ...prev,
        jobPosition: data.job_position || prev.jobPosition,
        jobDescription: data.job_description || prev.jobDescription,
        companyName: data.company_name || prev.companyName,
        companyDetails: data.company_details || prev.companyDetails,
      }));
    } catch {
      toast.dismiss("parse");
      toast.error("Failed to parse document");
    }
  };

  const toggleType = (t: string) => {
    setFormData((prev) => ({
      ...prev,
      type: prev.type.includes(t) ? prev.type.filter((x) => x !== t) : [...prev.type, t],
    }));
  };

  const generateQuestions = async () => {
    if (!formData.jobPosition || !formData.jobDescription) {
      toast.error("Please fill in job position and description");
      return;
    }
    if ((user?.credits ?? 0) <= 0) {
      toast.error("No credits remaining");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/api/ai/generate-questions", {
        jobPosition: formData.jobPosition,
        jobDescription: formData.jobDescription,
        duration: formData.duration,
        type: formData.type.join(", "),
        companyDetails: formData.companyDetails,
      });
      const content = data.content.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(content);
      setQuestions(parsed.interviewQuestions || []);
      setStep(2);
      toast.success("Questions generated!");
    } catch {
      toast.error("Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  const saveInterview = async () => {
    setLoading(true);
    try {
      const id = uuidv4();
      // Generate company summary
      let companySummary = "";
      if (formData.companyDetails) {
        try {
          const { data: summaryData } = await api.post("/api/ai/company-summary", {
            jobPosition: formData.jobPosition,
            jobDescription: formData.jobDescription,
            companyDetails: formData.companyDetails,
          });
          companySummary = summaryData.summary;
        } catch {
          // Continue without summary
        }
      }

      await api.post("/api/interviews/", {
        interview_id: id,
        job_position: formData.jobPosition,
        job_description: formData.jobDescription,
        company_name: formData.companyName,
        company_details: formData.companyDetails,
        duration: formData.duration,
        type: JSON.stringify(formData.type),
        question_list: questions,
        company_summary: companySummary,
      });

      // Save to job descriptions bank
      await api.post("/api/job-descriptions/", {
        role_title: formData.jobPosition,
        raw_text: formData.jobDescription,
        parsed_data: {
          company_name: formData.companyName,
          company_details: formData.companyDetails,
          job_position: formData.jobPosition,
          job_description: formData.jobDescription,
          interview_types: formData.type,
          duration: formData.duration,
        },
        interview_id: id,
      });

      const hostUrl = process.env.NEXT_PUBLIC_HOST_URL || "http://localhost:3000/interview";
      setInterviewId(id);
      setInterviewLink(`${hostUrl}/${id}`);
      setStep(3);
      toast.success("Interview created!");
      refreshUser();
    } catch {
      toast.error("Failed to save interview");
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: "", type: "Technical" }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: string) => {
    const updated = [...questions];
    (updated[idx] as any)[field] = value;
    setQuestions(updated);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Interview</h1>
          <p className="text-gray-500 text-sm">Step {step} of 3</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? "bg-amber-500" : "bg-gray-200"}`} />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-end">
              <label className="cursor-pointer">
                <input type="file" accept=".pdf,.docx,.doc" onChange={handleFileUpload} className="hidden" />
                <span className="flex items-center gap-2 text-sm text-amber-600 hover:underline">
                  <Upload className="w-4 h-4" /> Auto-fill from PDF/DOCX
                </span>
              </label>
            </div>

            <div>
              <label className="text-sm font-medium">Job Position *</label>
              <Input value={formData.jobPosition} onChange={(e) => setFormData({ ...formData, jobPosition: e.target.value })} placeholder="e.g. Senior Frontend Developer" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Job Description *</label>
              <Textarea value={formData.jobDescription} onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })} placeholder="Paste the full job description..." rows={5} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Company Name</label>
                <Input value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} placeholder="Acme Corp" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Duration (min)</label>
                <Input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} min="5" max="60" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Company Details</label>
              <Textarea value={formData.companyDetails} onChange={(e) => setFormData({ ...formData, companyDetails: e.target.value })} placeholder="Background, mission, culture..." rows={3} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Interview Types</label>
              <div className="flex flex-wrap gap-2">
                {InterviewTypes.map((t) => (
                  <button
                    key={t.title}
                    onClick={() => toggleType(t.title)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      formData.type.includes(t.title)
                        ? "bg-amber-100 border-amber-400 text-amber-700"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={generateQuestions} disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-black">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <>Generate Questions <ArrowRight className="w-4 h-4 ml-2" /></>}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{questions.length} Questions</h2>
              <Button variant="outline" size="sm" onClick={addQuestion}>+ Add Question</Button>
            </div>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <GripVertical className="w-4 h-4 mt-2.5 text-gray-400 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(i, "question", e.target.value)}
                      rows={2}
                      className="text-sm"
                      placeholder="Enter question..."
                    />
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(i, "type", e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      {InterviewTypes.map((t) => (
                        <option key={t.title} value={t.title}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => removeQuestion(i)} className="p-1 text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={saveInterview} disabled={loading || questions.length === 0} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save & Get Link"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Interview Created!</h2>
            <p className="text-gray-500 mb-6">Share this link with candidates</p>

            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 mb-6">
              <input readOnly value={interviewLink} className="flex-1 bg-transparent text-sm outline-none" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(interviewLink); toast.success("Link copied!"); }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => window.open(`mailto:?subject=Interview Invitation&body=${encodeURIComponent(interviewLink)}`, "_blank")}
              >
                <Mail className="w-4 h-4 mr-2" /> Email
              </Button>
              <Link href="/dashboard">
                <Button className="bg-amber-500 hover:bg-amber-600 text-black">Go to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
