"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center text-white">
      <div className="text-center max-w-3xl mx-auto px-6">
        <h1 className="text-6xl font-bold mb-4 bg-linear-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          HireEva
        </h1>
        <p className="text-xl text-gray-300 mb-2">AI-Powered Recruitment Platform</p>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Create AI-driven interviews, evaluate candidates with voice-based assessments,
          and match resumes to job descriptions — all automated.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="border-amber-500 text-amber-400 hover:bg-amber-500/10 px-8">
              Sign Up
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { title: "AI Interviews", desc: "Generate tailored questions and conduct voice-based interviews with Eva." },
            { title: "Smart Matching", desc: "Match resumes to job descriptions with AI-powered scoring." },
            { title: "Candidate Insights", desc: "Get detailed feedback, ratings, and recommendations automatically." },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-amber-400 font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
