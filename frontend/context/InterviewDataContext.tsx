"use client";
import React, { createContext, useState } from "react";

interface InterviewData {
  interviewData: any;
  [key: string]: any;
}

interface InterviewContextType {
  interviewInfo: InterviewData | null;
  setInterviewInfo: React.Dispatch<React.SetStateAction<InterviewData | null>>;
}

export const InterviewDataContext = createContext<InterviewContextType>({
  interviewInfo: null,
  setInterviewInfo: () => {},
});

export function InterviewDataProvider({ children }: { children: React.ReactNode }) {
  const [interviewInfo, setInterviewInfo] = useState<InterviewData | null>(null);

  return (
    <InterviewDataContext.Provider value={{ interviewInfo, setInterviewInfo }}>
      {children}
    </InterviewDataContext.Provider>
  );
}
