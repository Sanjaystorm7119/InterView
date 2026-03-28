"use client";
import { useContext, useEffect, useState, useMemo, useRef } from "react";
import { InterviewDataContext } from "@/context/InterviewDataContext";
import { Mic, MicOff, Timer } from "lucide-react";
import Image from "next/image";
import { IconPhoneEnd } from "@tabler/icons-react";
import { toast } from "sonner";
import Vapi from "@vapi-ai/web";
import AlertConfirmation from "./_components/AlertConfirmation";
import { interviewPrompt } from "@/constants/uiConstants";
import api from "@/lib/api";
import { useParams, useRouter } from "next/navigation";

export default function StartInterview() {
  const { interviewInfo } = useContext(InterviewDataContext);
  const [callStarted, setCallStarted] = useState(false);
  const [activeUser, setActiveUser] = useState(false);
  const [conversation, setConversation] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const callIdRef = useRef<string | null>(null);
  const [interviewPhase, setInterviewPhase] = useState("ready");
  const [isInterrupting, setIsInterrupting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef<any>(null);
  const router = useRouter();
  const { interview_id } = useParams();
  const feedbackGenerating = useRef(false);
  const conversationRef = useRef<string | null>(null);

  const vapi = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!key) return null;
    return new Vapi(key);
  }, []);

  const candidateName = interviewInfo?.interviewData?.candidateName || "Candidate";
  const candidateEmail = interviewInfo?.interviewData?.candidateEmail || "";

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (interviewInfo?.interviewData?.duration) {
      setTimeLeft(parseInt(interviewInfo.interviewData.duration) * 60);
    }
  }, [interviewInfo]);

  useEffect(() => {
    if (!isTimerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsTimerActive(false);
          setTimerExpired(true);
          toast.warning("Time expired! Please complete the current question.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isTimerActive]);

  useEffect(() => { conversationRef.current = conversation ?? null; }, [conversation]);

  const replaceSymbolsForTTS = (text: string) => {
    if (!text) return text;
    const replacements: Record<string, string> = {
      "===": "triple equals", "==": "double equals", "!==": "not triple equals",
      "!=": "not equals", "++": "plus plus", "--": "minus minus",
      "&&": "logical and", "||": "logical or", "<=": "less than or equal to",
      ">=": "greater than or equal to", "=>": "arrow function", "...": "spread operator",
    };
    let result = text;
    Object.entries(replacements).sort(([a], [b]) => b.length - a.length).forEach(([sym, rep]) => {
      result = result.replace(new RegExp(sym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), rep);
    });
    return result;
  };

  const cleanConversationData = (conv: any) => {
    try {
      const data = typeof conv === "string" ? JSON.parse(conv) : conv;
      return data.filter((item: any) => item.role !== "system").map((item: any) => ({
        role: item.role, content: item.content, timestamp: item.timestamp || new Date().toISOString(),
      }));
    } catch { return null; }
  };

  useEffect(() => {
    if (!vapi) return;
    const handleMessage = (message: any) => {
      if (message?.conversation) setConversation(JSON.stringify(message.conversation));
    };
    vapi.on("message", handleMessage);
    return () => { vapi.off("message", handleMessage); };
  }, [vapi]);

  useEffect(() => {
    if (!vapi) return;

    const handleCallStart = (callData: any) => {
      const id = callData?.call?.id || callData?.id || `call_${Date.now()}`;
      callIdRef.current = id;
      setCallId(id);
      toast("Call Connected");
      setCallStarted(true);
      setInterviewPhase("briefing");
      setIsTimerActive(true);
    };

    const handleSpeechStart = () => { setActiveUser(false); };
    const handleSpeechEnd = () => { setActiveUser(true); };

    const handleCallEnd = (callData: any) => {
      toast("Interview ended");
      setInterviewPhase("ended");
      setIsTimerActive(false);
      const finalConversation = callData?.conversation || conversationRef.current;
      if (!feedbackGenerating.current) {
        feedbackGenerating.current = true;
        setLoading(true);
        setTimeout(() => GenerateFeedback(finalConversation, callIdRef.current), 500);
      }
    };

    // @ts-expect-error Vapi SDK types don't include callData param
    vapi.on("call-start", handleCallStart);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    // @ts-expect-error Vapi SDK types don't include callData param
    vapi.on("call-end", handleCallEnd);

    return () => {
      vapi.off("call-start", handleCallStart);
      vapi.off("speech-start", handleSpeechStart);
      vapi.off("speech-end", handleSpeechEnd);
      vapi.off("call-end", handleCallEnd);
    };
  }, [vapi]);

  const GenerateFeedback = async (conv: any, cid: string | null) => {
    try {
      if (!conv) { setLoading(false); return; }
      const cleaned = cleanConversationData(conv);
      if (!cleaned) { setLoading(false); return; }

      toast.loading("Generating feedback...", { id: "feedback-loading" });

      const result = await api.post("/api/ai/generate-feedback", {
        conversation: JSON.stringify(cleaned),
        interview_id: interview_id,
        user_email: candidateEmail || "anonymous@interview.com",
        call_id: cid || "",
        companyDetails: interviewInfo?.interviewData?.companyDetails || "",
      });

      const content = result.data.content.replace(/```json/g, "").replace(/```/g, "").trim();
      const feedbackData = JSON.parse(content);

      toast.dismiss("feedback-loading");
      toast.success("Feedback generated!");

      await api.post(`/api/interviews/${interview_id}/feedback`, {
        interview_id: interview_id as string,
        user_email: candidateEmail || "anonymous@interview.com",
        user_name: candidateName,
        feedback: feedbackData,
        transcript: JSON.stringify(cleaned),
        call_id: cid || "",
      });

      router.replace(`/interview/${interview_id}/completed`);
    } catch (err) {
      toast.dismiss("feedback-loading");
      toast.error("Failed to generate feedback");
    } finally {
      feedbackGenerating.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!interviewInfo) {
      router.replace(`/interview/${interview_id}`);
      return;
    }
    if (vapi) startCall();
  }, [interviewInfo, vapi]);

  const startCall = () => {
    if (!vapi || !interviewInfo) return;

    const questionsList = interviewInfo.interviewData.question_list
      ?.map((item: any, i: number) => `${i + 1}. ${replaceSymbolsForTTS(item?.question)}`)
      .join("\n");

    const totalQuestions = interviewInfo.interviewData.question_list?.length || 0;
    const companyInfo = interviewInfo.interviewData.company_details
      ? `\n\nCompany Details:\n${interviewInfo.interviewData.company_details}\n\n` : "";

    const assistantOptions = {
      name: "Eva",
      firstMessage: `Hi ${candidateName}, I am Eva and I will be conducting the interview. ${
        interviewInfo.interviewData.company_summary || `Welcome to ${interviewInfo.interviewData.company_name || "our company"}.`
      } Please let me know if you have any questions, or if you're ready to proceed.`,
      maxDurationSeconds: 3900,
      endCallMessage: "Thank you for interviewing with us. Have a great day!",
      transcriber: { provider: "deepgram" as const, model: "nova-3", language: "en" },
      voice: { provider: "vapi" as const, voiceId: "Spencer" },
      model: {
        provider: "openai" as const,
        model: "gpt-4.1-mini",
        messages: [{
          role: "system" as const,
          content: `${interviewPrompt(questionsList)}${companyInfo}
TOTAL QUESTIONS: ${totalQuestions}
QUESTIONS: ${questionsList}
Ask questions one at a time. Wait for complete answers. After the last question, close the interview and use endCall.`,
        }],
        tools: [{ type: "endCall" as const }],
      },
      startSpeakingPlan: { waitSeconds: 2 },
      stopSpeakingPlan: { numWords: 1, voiceSeconds: 0.1, backoffSeconds: 2 },
    };

    try {
      // @ts-expect-error Vapi SDK strict typing for assistant options
      vapi.start(assistantOptions);
      toast.success("Call started with AI Recruiter");
    } catch (err: any) {
      toast.error("Failed to start call: " + err.message);
    }
  };

  const stopInterview = () => {
    try {
      vapi?.stop();
      setCallStarted(false);
      setInterviewPhase("ended");
      setIsTimerActive(false);
    } catch { toast.error("Failed to end interview"); }
  };

  const toggleMic = () => {
    if (!callStarted) return;
    try {
      vapi?.setMuted(!isMicMuted);
      setIsMicMuted(!isMicMuted);
    } catch { /* ignore */ }
  };

  return (
    <div className="p-10 lg:px-48 xl:px-56">
      <h2 className="font-bold text-xl flex justify-between">
        Interview
        <span className="flex items-center gap-2">
          <Timer />
          <span className={`font-mono ${timeLeft <= 60 && timeLeft > 0 ? "text-red-500" : ""} ${timerExpired ? "text-red-500 font-bold" : ""}`}>
            {timerExpired ? "TIME EXPIRED" : formatTime(timeLeft)}
          </span>
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
        <div className="bg-white h-[400px] rounded-3xl border flex items-center justify-center">
          <div className="relative">
            {!activeUser && <span className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping" />}
            <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-3xl font-bold">E</div>
          </div>
        </div>
        <div className="bg-white h-[400px] rounded-3xl border flex flex-col items-center justify-center">
          <div className="relative">
            {activeUser && !isMicMuted && <span className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping" />}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${isMicMuted ? "bg-red-300" : "bg-blue-300"}`}>
              {candidateName[0]?.toUpperCase()}
            </div>
          </div>
          <p className="mt-2 font-medium">{candidateName}</p>
          {isMicMuted && <p className="text-red-500 text-sm mt-1">Microphone Muted</p>}
        </div>
      </div>

      {!loading && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button onClick={toggleMic} className={`h-12 w-12 p-2 rounded-full cursor-pointer transition-colors ${isMicMuted ? "bg-red-500 text-white" : "bg-gray-500 text-white"}`}>
            {isMicMuted ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </button>
          <AlertConfirmation stopInterview={stopInterview}>
            <IconPhoneEnd className="h-12 w-12 p-1 bg-red-400 text-white rounded-full cursor-pointer" />
          </AlertConfirmation>
        </div>
      )}

      <p className="text-gray-400 text-center mt-4">
        {loading ? "Generating feedback..." : callStarted ? `Interview in progress — ${interviewPhase}` : "Connecting..."}
      </p>
    </div>
  );
}
