import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { Match, scoreColor } from "./types";

interface Props {
  result: { match: Match; summary?: string };
  onEmailClick: (match: Match) => void;
}

export default function MatchResultCard({ result, onEmailClick }: Props) {
  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Match Result</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEmailClick(result.match)}
              className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 border border-amber-200 rounded px-2.5 py-1"
            >
              <Mail className="w-4 h-4" />
              Email Candidate
            </button>
            <span className={`text-2xl font-bold px-4 py-1 rounded-lg ${scoreColor(result.match.confidence_score)}`}>
              {result.match.confidence_score}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: "Skills", value: result.match.skills_score },
            { label: "Experience", value: result.match.experience_score },
            { label: "Semantic", value: result.match.semantic_score },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-lg font-bold ${scoreColor(s.value ?? 0)}`}>{s.value}%</p>
            </div>
          ))}
        </div>

        {(result.match.matched_skills?.length ?? 0) > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-green-700 mb-1">Matched Skills:</p>
            <div className="flex flex-wrap gap-1">
              {result.match.matched_skills!.map((s, i) => (
                <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{s}</span>
              ))}
            </div>
          </div>
        )}

        {(result.match.missing_skills?.length ?? 0) > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-red-700 mb-1">Missing Skills:</p>
            <div className="flex flex-wrap gap-1">
              {result.match.missing_skills!.map((s, i) => (
                <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">{s}</span>
              ))}
            </div>
          </div>
        )}

        {result.summary && (
          <p className="text-sm text-gray-600 mt-3">{result.summary}</p>
        )}
      </CardContent>
    </Card>
  );
}
