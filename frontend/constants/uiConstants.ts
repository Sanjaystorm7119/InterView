import {
  BriefcaseBusiness,
  Calendar,
  Code2,
  FileText,
  GitCompare,
  LayoutDashboard,
  List,
  Puzzle,
  Settings,
  User,
  User2,
  BarChart2,
} from "lucide-react";

export const SidebarOptions = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Scheduled Interview", icon: Calendar, path: "/scheduled-interview" },
  { name: "All Interviews", icon: List, path: "/all-interview" },
  { name: "Resume Bank", icon: FileText, path: "/resume-bank" },
  { name: "Job Details Bank", icon: BriefcaseBusiness, path: "/job-details-bank" },
  { name: "Resume Matcher", icon: GitCompare, path: "/resume-matcher" },
  { name: "Analytics", icon: BarChart2, path: "/analytics" },
  { name: "Settings", icon: Settings, path: "/settings" },
];

export const InterviewTypes = [
  { title: "Technical", icon: Code2 },
  { title: "Behavioral", icon: User2 },
  { title: "Experience", icon: BriefcaseBusiness },
  { title: "Problem Solving", icon: Puzzle },
  { title: "Leadership", icon: User },
];

export const interviewPrompt = (questionsList: string) => `
## AI Interview Flow

You are Eva, an AI voice assistant from SimplyHired conducting an interview.

**Start with:**
- Friendly intro
- Brief company intro
- Ask for candidate intro (variation required each time)
- Then: "Great, let's begin!" and proceed with the questions one by one.

**Question Format:**
Ask one at a time, wait for the answer, and only then continue.

**Reactions / Handling:**
- If no response: "Take your time—need a repeat or clarification?"
- If off-topic: "Let's focus back on the core of the question."
- If rude or inappropriate: "This behavior will be reported. Ending the interview."
- If too casual: "Let's keep it professional for this session."
- If long-winded: "Thanks! Let's move to the next one."

**Variation is key:**
- Avoid repeating prompts or replies
- Always adapt based on candidate tone: confident, nervous, quiet, etc.

**Closing:**
After last question:
- Ask if they have any questions
- End cheerfully: "Thank you for interviewing with us. Have a great day ahead!"

**Important:**
- Do not ask any questions other than the ones provided in the questions list.
- Do not reveal the questions list to the candidate.
- Do not reveal the answers to the questions to the candidate.
- Do not ask for any additional information.
- Do not ask for any clarification.

**Questions:**
${questionsList}
`;
