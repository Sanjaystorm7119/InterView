"use client";
import { useEffect, useState, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import { InterviewDataContext } from "@/context/InterviewDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mic, Camera, Wifi, CheckCircle2, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function InterviewJoinPage() {
  const { interview_id } = useParams();
  const router = useRouter();
  const { setInterviewInfo } = useContext(InterviewDataContext);
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [checklist, setChecklist] = useState({ mic: false, camera: false, internet: true });

  useEffect(() => {
    loadInterview();
  }, [interview_id]);

  const loadInterview = async () => {
    try {
      const { data } = await api.get(`/api/interviews/public/${interview_id}`);
      setInterview(data);
    } catch {
      toast.error("Interview not found");
    } finally {
      setLoading(false);
    }
  };

  const checkMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setChecklist((c) => ({ ...c, mic: true }));
      toast.success("Microphone working!");
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const checkCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setChecklist((c) => ({ ...c, camera: true }));
      toast.success("Camera working!");
    } catch {
      toast.error("Camera access denied");
    }
  };

  const startInterview = () => {
    if (!candidateName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!checklist.mic) {
      toast.error("Please check your microphone first");
      return;
    }

    setInterviewInfo({
      interviewData: {
        ...interview,
        candidateName,
        candidateEmail,
      },
    });
    router.push(`/interview/${interview_id}/start`);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>;
  if (!interview) return <div className="text-center py-20 text-gray-500">Interview not found</div>;

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <Card>
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">{interview.job_position}</h1>
            <p className="text-gray-500">{interview.company_name} &middot; {interview.duration} min interview</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-medium">Your Name *</label>
              <Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Full name" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Your Email (optional)</label>
              <Input type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} placeholder="you@email.com" className="mt-1" />
            </div>
          </div>

          <h3 className="font-semibold text-sm mb-3">Pre-Interview Checklist</h3>
          <div className="space-y-2 mb-6">
            {[
              { label: "Microphone", icon: Mic, checked: checklist.mic, action: checkMic },
              { label: "Camera (optional)", icon: Camera, checked: checklist.camera, action: checkCamera },
              { label: "Internet Connection", icon: Wifi, checked: checklist.internet, action: undefined },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <item.icon className="w-5 h-5 text-gray-500" />
                <span className="flex-1 text-sm">{item.label}</span>
                {item.checked ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : item.action ? (
                  <Button variant="outline" size="sm" onClick={item.action}>Test</Button>
                ) : null}
              </div>
            ))}
          </div>

          <Button onClick={startInterview} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" size="lg">
            Join Interview
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
