"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function InterviewCompletedPage() {
  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <Card>
        <CardContent className="p-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Interview Complete!</h1>
          <p className="text-gray-500 mb-8">
            Thank you for taking the time to complete this interview. Your responses have been recorded and feedback has been generated.
          </p>

          <div className="space-y-4 text-left bg-gray-50 rounded-lg p-5 mb-8">
            <h3 className="font-semibold text-sm">What happens next?</h3>
            <div className="space-y-3">
              {[
                { step: "1", text: "Your responses are being analyzed by our AI system" },
                { step: "2", text: "The recruiter will review your feedback and ratings" },
                { step: "3", text: "You'll hear back from the hiring team soon" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {item.step}
                  </span>
                  <p className="text-sm text-gray-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <Link href="/">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black">Back to Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
