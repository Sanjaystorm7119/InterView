"use client";
import { InterviewDataProvider } from "@/context/InterviewDataContext";
import Link from "next/link";

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <InterviewDataProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b px-6 py-3 flex items-center">
          <Link href="/" className="text-xl font-bold text-amber-500">HireEva</Link>
        </header>
        <div>{children}</div>
      </div>
    </InterviewDataProvider>
  );
}
